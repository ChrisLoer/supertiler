# supertiler [![Build Status](https://travis-ci.org/ChrisLoer/supertiler.svg?branch=master)](https://travis-ci.org/ChrisLoer/supertiler)
[GeoJSON](https://tools.ietf.org/html/rfc7946) -> [MBTiles](https://github.com/mapbox/mbtiles-spec/blob/master/1.3/spec.md) using [Supercluster](https://github.com/mapbox/supercluster).

Use Supertiler when you want to make a tiled dataset out of a large set of GeoJSON point features. Supertiler uses Supercluster to cluster points, in order to improve performance and keep low-zoom tiles from violating the 500KB size limit for tilesets hosted by Mapbox. For a more general purpose tileset generating tool, see [Tippecanoe](https://github.com/mapbox/tippecanoe). Among its many features, Tippecanoe also supports point clustering, but using Supercluster has a few advantages:

- You can control the order in which features are added to clusters. This is helpful for making clusters tend to be geographically centered around the "most important" of their features.
- Supercluster's cluster radius is precise, while Tippecanoe uses a (faster) approximation
- Supercluster supports custom property aggregation functions, while Tippecanoe provides a set of pre-defined aggregators.
- [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js) uses Supercluster for clustering, so if you've made a map with client-side clustering and want to switch to server-hosted (and tiled) data, Supertiler allows for a direct translation.

Many thanks to @mourner and @e-n-f, from whom I have copied liberally!

## Usage
### Node
```
import supertiler from 'supertiler';
supertiler({
    input: 'input.geojson',
    output: 'output.mbtiles',
    maxZoom: 2
}).then(null, err => console.log(err));
```

### Command Line
```
npm install -g supertiler
supertiler -i input.geojson -o output.mbtiles
```

```
Usage: supertiler.js [options]

Options:
  --version                    Show version number                     [boolean]
  --input, -i                  Input in GeoJSON format. Each feature's geometry
                               must be a GeoJSON Point.               [required]
  --output, -o                 Path of output MBTiles database        [required]
  -h, --help                   Show help                               [boolean]
  --includeUnclustered         Include one zoom level above the max clustering
                               zoom.                   [boolean] [default: true]
  --minZoom                    Minimum zoom level at which clusters are
                               generated.                  [number] [default: 0]
  --maxZoom                    Maximum zoom level at which clusters are
                               generated.                  [number] [default: 8]
  --radius                     Cluster radius, in pixels. [number] [default: 40]
  --extent                     (Tiles) Tile extent. Radius is calculated
                               relative to this value.   [number] [default: 512]
  --nodeSize                   Size of the KD-tree leaf node. Affects
                               performance.               [number] [default: 64]
  --map                        A javscript function that returns cluster
                               properties corresponding to a single point. See
                               supercluster documentation.              [string]
  --reduce                     A javscript reduce function that merges
                               properties of two clusters into one. See
                               supercluster documentation.              [string]
  --filter                     A javscript function that filters features from
                               the resulting tiles based on their properties.
                                                                        [string]
  --storeClusterExpansionZoom  Store the "cluster expansion zoom" as a property
                               for each cluster.      [boolean] [default: false]
  --attribution                (HTML): An attribution string, which explains the
                               sources of data and/or style for the map.[string]
  --bounds                     (string of comma-separated numbers): The maximum
                               extent of the rendered map area. See MBTiles
                               spec.          [string] [default: (entire world)]
  --center                     (comma-separated numbers): The longitude,
                               latitude, and zoom level of the default view of
                               the map. See MBTiles spec.
                                               [string] [default: (null island)]
  --description                A description of the tileset's content.  [string]
  --tileSpecVersion            The version of the Mapbox Vector Tile
                               Specification to use. See MBTiles spec.
                                                           [number] [default: 2]
  --logPerformance             Output performance timing logs to console.
                                                                       [boolean]

Examples:
  supertiler.js -i in.geojson -o            Cluster from zoom 0 to 5 while
  out.mbtiles --minZoom 0 --maxZoom 5       aggregating "myValue" into "sum"
  --map "(props) => ({sum:                  property. Outputs tileset with zoom
  props.myValue})" --reduce "(accumulated,  from 0 to 6.
  props) => { accumulated.sum +=
  props.sum; }"

Generation will fail if any tile goes over maximum size of 500KB. In this case,
try increasing cluster radius, increasing max zoom, or generating fewer
aggregated properties.
```

## Developing
```
npm install       # install dependencies
npm test          # run tests
```
