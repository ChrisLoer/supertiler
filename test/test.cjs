// import tap from 'tap';
const tap = require('tap');
const supertiler = require('../main.cjs');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
// import {open} from 'sqlite';
// import sqlite3 from 'sqlite3';

const test = tap.test;

test('mbtiles sanity test', (t) => {
    supertiler({
        input: './test/places.geojson',
        output: './test/basic.mbtiles',
        maxZoom: 2
    }).then(() => {
        open({filename: './test/basic.mbtiles', driver: sqlite3.Database}, {Promise}).then((db) => {
            Promise.all([
                db.all('SELECT * FROM metadata'),
                db.all('SELECT * from tiles')
            ]).then((results) => {
                const metadata = results[0];
                const tiles = results[1];
                const expectedMetadata = {
                    'name': './test/basic.mbtiles',
                    'bounds': '-180.0,-85,180,85',
                    'center': '0,0,0',
                    'type': 'overlay',
                    'version': '2',
                    'maxZoom': '2',
                    'format': 'pbf',
                    'minZoom': '0',
                    'json': '{"vector_layers":[{"id":"geojsonLayer","description":"Point layer imported from GeoJSON.","fields":{"cluster":"boolean","cluster_id":"number","point_count":"number","point_count_abbreviated":"number","scalerank":"number","name":"string","comment":"object","name_alt":"object","lat_y":"number","long_x":"number","region":"string","subregion":"string","featureclass":"string"}}]}'
                };
                const roundTripMetadata = {};
                for (const row of metadata) {
                    roundTripMetadata[row.name] = row.value;
                }
                t.same(roundTripMetadata, expectedMetadata);

                t.equals(tiles.length, 19);
                t.end();
            });
        });
    });
});
