import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

class MapCacheService {
  constructor() {
    this.cacheDirectory = Platform.OS === 'ios' 
      ? `${RNFS.DocumentDirectoryPath}/map_tiles` 
      : `${RNFS.ExternalDirectoryPath}/map_tiles`;
    
    this.ensureCacheDirectory();
    this.cachedTiles = new Set();
    this.initializeCachedTilesList();
  }

  // Create cache directory if it doesn't exist
  async ensureCacheDirectory() {
    try {
      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        await RNFS.mkdir(this.cacheDirectory);
        console.log('Created map tiles cache directory');
      }
    } catch (error) {
      console.error('Error creating cache directory:', error);
    }
  }

  // Initialize the list of cached tiles
  async initializeCachedTilesList() {
    try {
      const exists = await RNFS.exists(this.cacheDirectory);
      if (exists) {
        const files = await RNFS.readdir(this.cacheDirectory);
        files.forEach(file => {
          if (file.endsWith('.png')) {
            this.cachedTiles.add(file.replace('.png', ''));
          }
        });
        console.log(`Loaded ${this.cachedTiles.size} cached map tiles`);
      }
    } catch (error) {
      console.error('Error loading cached tiles list:', error);
    }
  }

  // Generate a unique key for a tile based on coordinates and zoom level
  getTileKey(x, y, zoom) {
    return `${zoom}_${x}_${y}`;
  }

  // Get the local path for a tile
  getTilePath(x, y, zoom) {
    const key = this.getTileKey(x, y, zoom);
    return `${this.cacheDirectory}/${key}.png`;
  }

  // Check if a tile is cached
  isTileCached(x, y, zoom) {
    const key = this.getTileKey(x, y, zoom);
    return this.cachedTiles.has(key);
  }

  // Get a tile from cache or download it
  async getTile(x, y, zoom, tileServerUrl) {
    const key = this.getTileKey(x, y, zoom);
    const localPath = this.getTilePath(x, y, zoom);
    
    // If tile is already cached, return its local path
    if (this.isTileCached(x, y, zoom)) {
      return `file://${localPath}`;
    }
    
    // Otherwise, download the tile
    try {
      const url = tileServerUrl
        .replace('{x}', x)
        .replace('{y}', y)
        .replace('{z}', zoom);
      
      // Download the tile
      await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
      }).promise;
      
      // Add to cached tiles set
      this.cachedTiles.add(key);
      console.log(`Cached tile: ${key}`);
      
      return `file://${localPath}`;
    } catch (error) {
      console.error(`Error caching tile ${key}:`, error);
      return null;
    }
  }

  // Pre-cache tiles for a specific region
  async preCacheRegion(region, minZoom, maxZoom, tileServerUrl) {
    const latLngBounds = this.getLatLngBounds(region);
    let cachedCount = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      // Convert region to tile coordinates
      const minTile = this.latLngToTile(latLngBounds.minLat, latLngBounds.minLng, zoom);
      const maxTile = this.latLngToTile(latLngBounds.maxLat, latLngBounds.maxLng, zoom);
      
      for (let x = minTile.x; x <= maxTile.x; x++) {
        for (let y = minTile.y; y <= maxTile.y; y++) {
          if (!this.isTileCached(x, y, zoom)) {
            await this.getTile(x, y, zoom, tileServerUrl);
            cachedCount++;
          }
        }
      }
    }
    
    console.log(`Pre-cached ${cachedCount} tiles`);
    return cachedCount;
  }

  // Convert latitude/longitude to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  // Get bounds of a region
  getLatLngBounds(region) {
    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    
    return {
      minLat: region.latitude - latDelta / 2,
      maxLat: region.latitude + latDelta / 2,
      minLng: region.longitude - lngDelta / 2,
      maxLng: region.longitude + lngDelta / 2
    };
  }

  // Clear cache
  async clearCache() {
    try {
      await RNFS.unlink(this.cacheDirectory);
      await this.ensureCacheDirectory();
      this.cachedTiles.clear();
      console.log('Map cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache size in MB
  async getCacheSize() {
    try {
      const stats = await RNFS.stat(this.cacheDirectory);
      return stats.size / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

// Export as singleton
export default new MapCacheService();