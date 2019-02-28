#!/usr/bin/env node
const Supercluster = require('supercluster');
const Sqlite = require('sqlite');
const Yargs = require('yargs');
const fs = require('fs')
const VTpbf = require('vt-pbf');
const {gzip} = require('node-gzip');

const argv = Yargs.usage('Usage: $0 [options]')
    .example('$0 -i in.geojson -o out.mbtiles --minZoom 0 --maxZoom 5 --map "(props) => ({sum: props.myValue})" --reduce "(accumulated, props) => { accumulated.sum += props.sum; }"',
             'Cluster from zoom 0 to 5 while aggregating "myValue" into "sum" property. Outputs tileset with zoom from 0 to 6.')
    .alias('i', 'input')
    .nargs('i', 1)
    .describe('i', 'Input in GeoJSON format. Each feature\'s geometry must be a GeoJSON Point.')
    .alias('o', 'output')
    .nargs('o', 1)
    .describe('o', 'Path of output MBTiles database')
    .demandOption(['i', 'o'])
    .help('h')
    .alias('h', 'help')
    .describe('minZoom', 'Minimum zoom level at which clusters are generated.')
    .default('minZoom', 0).nargs('minZoom', 1).number('minZoom')
    .describe('maxZoom', 'Maximum zoom level at which clusters are generated. Output tileset will include one zoom level higher (unclustered).')
    .default('maxZoom', 16).nargs('maxZoom', 1).number('maxZoom')
    .describe('radius', 'Cluster radius, in pixels.')
    .default('radius', 40).nargs('radius', 1).number('radius')
    .describe('extent', '(Tiles) Tile extent. Radius is calculated relative to this value.')
    .default('extent', 512).nargs('extent', 1).number('extent')
    .describe('nodeSize', 'Size of the KD-tree leaf node. Affects performance.')
    .default('nodeSize', 64).nargs('nodeSize', 1).number('nodeSize')
    .describe('map', 'A javscript function that returns cluster properties corresponding to a single point. See supercluster documentation.')
    .string('map').nargs('map', 1)
    .describe('reduce', 'A javscript reduce function that merges properties of two clusters into one. See supercluster documentation.')
    .string('reduce').nargs('reduce', 1)
    .describe('attribution', '(HTML): An attribution string, which explains the sources of data and/or style for the map.')
    .string('attribution').nargs('attribution', 1)
    .describe('bounds', '(string of comma-separated numbers): The maximum extent of the rendered map area. See MBTiles spec.')
    .string('bounds').nargs('bounds', 1)
    .default('bounds', "-180.0,-85,180,85", "(entire world)")
    .describe('center', '(comma-separated numbers): The longitude, latitude, and zoom level of the default view of the map. See MBTiles spec.')
    .string('center').nargs('center', 1)
    .default('center', "0,0,0", "(null island)")
    .describe('description', 'A description of the tileset\'s content.')
    .string('description').nargs('description', 1)
    .describe('tilesetVersion', 'The version of the tileset. See MBTiles spec.')
    .number('tilesetVersion').nargs('tilesetVersion', 1)
    .epilogue('Generation will fail if any tile goes over maximum size of 500KB. In this case, try increasing cluster radius, increasing max zoom, or generating fewer aggregated properties.')
    .argv;

const clustered = new Supercluster({
    minZoom: argv.minZoom,
    maxZoom: argv.maxZoom,
    radius: argv.radius,
    extent: argv.extent,
    nodeSize: argv.nodeSize,
    map: argv.map ? eval(argv.map) : null,
    reduce: argv.reduce ? eval(argv.reduce) : null
}).load(JSON.parse(fs.readFileSync(argv.i)).features);

fs.unlinkSync(argv.o); // Clear previous MBTiles, if it exists
Sqlite.open(argv.o, { Promise }).then((db) => {
    Promise.all([
        db.run('PRAGMA application_id = 0x4d504258'), // See https://www.sqlite.org/src/artifact?ci=trunk&filename=magic.txt
        db.run('CREATE TABLE metadata (name text, value text)'),
        db.run('CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob)')
    ]).then((metadata, tiles) => {
        // Build metadata table
        db.run('INSERT INTO metadata (name, value) VALUES ("name", ?)', argv.o);
        db.run('INSERT INTO metadata (name, value) VALUES ("format", "pbf")');
        db.run('INSERT INTO metadata (name, value) VALUES ("minZoom", ?)', argv.minZoom);
        db.run('INSERT INTO metadata (name, value) VALUES ("maxZoom", ?)', argv.maxZoom + 1);
        db.run('INSERT INTO metadata (name, value) VALUES ("bounds", ?)', argv.bounds);
        db.run('INSERT INTO metadata (name, value) VALUES ("center", ?)', argv.center);
        db.run('INSERT INTO metadata (name, value) VALUES ("type", "overlay")'); // See MBTiles spec: I think "overlay" is most appropriate here
        if (argv.attribution) {
            db.run('INSERT INTO metadata (name, value) VALUES ("attribution", ?)', argv.attribution);
        }
        if (argv.description) {
            db.run('INSERT INTO metadata (name, value) VALUES ("description", ?)', argv.description);
        }
        if (argv.tilesetVersion) {
            db.run('INSERT INTO metadata (name, value) VALUES ("version", ?)', argv.tilesetVersion);
        }

        const fields = {};
        const statements = [];
        // Insert tiles
        for (let z = argv.minZoom; z <= argv.maxZoom + 1; z++) {
            const zoomDimension = Math.pow(2, z);
            // TODO: No need to process tiles outside of bounds
            for (let x = 0; x < zoomDimension; x++) {
                for (let y = 0; y < zoomDimension; y++) {
                    const tile = clustered.getTile(z, x, y);
                    if (!tile || tile.features.length === 0) {
                        // Don't serialize empty tiles
                        continue;
                    }
                    // Collect field information for metadata
                    for (const feature of tile.features) {
                        for (const property in feature.tags) {
                            fields[property] = typeof feature.tags[property];
                        }
                    }

                    // Convert to PBF and compress before insertion
                    gzip(VTpbf.fromGeojsonVt({ 'geojsonLayer': tile })).then((compressed) => {
                        if (compressed.length > 500000) {
                            throw new Error(`Tile {z}, {x}, {y} greater than 500KB`);
                        }
                        statements.push(
                            db.run(
                                'INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES(?, ?, ?, ?)',
                                z, x, y, compressed));
                    });
                }
            }
        }

        // Complete metadata table by adding layer definition
        const vectorJson = {
            "vector_layers":
                [{
                    "id": "geojsonLayer",
                    "description": "Point layer imported from GeoJSON.",
                    "fields": fields
                }]
            };
        statements.push(
            db.run('INSERT INTO metadata (name, value) VALUES ("json", ?)', JSON.stringify(vectorJson)));

        Promise.all(statements).then(() => {
            // TODO include stats?
            console.log("Finished generating MBTiles.");
        });
    });
});
