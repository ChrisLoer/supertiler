#!/usr/bin/env node
const Supercluster = require('supercluster');
const Sqlite = require('sqlite');
const Yargs = require('yargs');

const argv = Yargs.usage('Usage: $0 [options]')
    .example('$0 -i in.geojson -o out.mbtiles --minZoom 0 --maxZoom 5 --map "(props) => ({sum: props.myValue})" --reduce "(accumulated, props) => { accumulated.sum += props.sum; }"',
             'Cluster from zoom 0 to 5 while aggregating "myValue" into "sum" property. Outputs tileset with zoom from 0 to 6.')
    .alias('i', 'input')
    .nargs('i', 1)
    .describe('i', 'Input in GeoJSON format')
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
    .epilogue('Generation will fail if any tile goes over maximum size of 500KB. In this case, try increasing cluster radius, increasing max zoom, or generating fewer aggregated properties.')
    .argv;
