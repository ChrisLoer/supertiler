#!/usr/bin/env node

const Yargs = require('yargs');
const supertiler = require('./index.js');

const argv = Yargs.usage('Usage: $0 [options]')
    .example('$0 -i in.geojson -o out.mbtiles --minZoom 0 --maxZoom 5 --map "(props) => ({sum: props.myValue})" --reduce "(accumulated, props) => { accumulated.sum += props.sum; }"',
        'Cluster from zoom 0 to 5 while aggregating "myValue" into "sum" property. Outputs tileset with zoom from 0 to 6.')
    .alias('input', 'i')
    .nargs('input', 1)
    .describe('input', 'Input in GeoJSON format. Each feature\'s geometry must be a GeoJSON Point.')
    .alias('output', 'o')
    .nargs('output', 1)
    .describe('output', 'Path of output MBTiles database')
    .demandOption(['i', 'o'])
    .help('h')
    .alias('h', 'help')
    .describe('includeUnclustered', 'Include one zoom level above the max clustering zoom.')
    .default('includeUnclustered', true).boolean('includeUnclustered').nargs('includeUnclustered', 1)
    .describe('minZoom', 'Minimum zoom level at which clusters are generated.')
    .default('minZoom', 0).nargs('minZoom', 1).number('minZoom')
    .describe('maxZoom', 'Maximum zoom level at which clusters are generated..')
    .default('maxZoom', 8).nargs('maxZoom', 1).number('maxZoom')
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
    .describe('filter', 'A javscript function that filters features from the resulting tiles based on their properties.')
    .string('filter').nargs('filter', 1)
    .describe('attribution', '(HTML): An attribution string, which explains the sources of data and/or style for the map.')
    .string('attribution').nargs('attribution', 1)
    .describe('bounds', '(string of comma-separated numbers): The maximum extent of the rendered map area. See MBTiles spec.')
    .string('bounds').nargs('bounds', 1)
    .default('bounds', '-180.0,-85,180,85', '(entire world)')
    .describe('center', '(comma-separated numbers): The longitude, latitude, and zoom level of the default view of the map. See MBTiles spec.')
    .string('center').nargs('center', 1)
    .default('center', '0,0,0', '(null island)')
    .describe('description', 'A description of the tileset\'s content.')
    .string('description').nargs('description', 1)
    .describe('tileSpecVersion', 'The version of the Mapbox Vector Tile Specification to use. See MBTiles spec.')
    .number('tileSpecVersion').nargs('tileSpecVersion', 1).default('tileSpecVersion', 2)
    .describe('logPerformance', 'Output performance timing logs to console.')
    .boolean('logPerformance')
    .epilogue('Generation will fail if any tile goes over maximum size of 500KB. In this case, try increasing cluster radius, increasing max zoom, or generating fewer aggregated properties.')
    .argv;

if (argv.map) {
    argv.map = eval(argv.map);
}
if (argv.reduce) {
    argv.reduce = eval(argv.reduce);
}
if (argv.filter) {
    argv.filter = eval(argv.filter);
}

supertiler(argv).then(null, err => console.log(err));
