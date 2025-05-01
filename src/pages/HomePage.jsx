// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, InfoWindow } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import apiClient from '../services/api';
import './HomePage.css';
import PropTypes from 'prop-types';

// --- 常量定義 ---
const containerStyle = { width: '100%', height: 'calc(100vh - 60px)', minHeight: '400px' };
const center = { lat: 23.6978, lng: 120.9605 };
const defaultMapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  zoomControl: true,
  gestureHandling: 'greedy',
};
// --- ---

const HomePage = () => {
  // --- 地圖 Loader ---
  const { isLoaded: mapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_Maps_API_KEY || '',
    libraries: ['places'],
    language: 'zh-TW',
  });

  // --- State 和 Refs ---
  const mapRef = useRef(null);
  const markerClustererRef = useRef(null);
  const markersRef = useRef({});
  const [shops, setShops] = useState([]);
  const [loadingMapData, setLoadingMapData] = useState(false);
  const [errorMapData, setErrorMapData] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const navigate = useNavigate();

  // --- 搜尋相關 State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  // --- ---

  // --- 地圖加載/卸載回調 ---
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (window.google && !markerClustererRef.current) {
      markerClustererRef.current = new MarkerClusterer({ map });
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
      markerClustererRef.current = null;
    }
    markersRef.current = {};
    mapRef.current = null;
  }, []);
  // --- ---

  // --- 獲取範圍內店家數據 ---
  const fetchShopsInBounds = useCallback(async (bounds) => {
    if (!bounds) return;
    setLoadingMapData(true);
    setErrorMapData(null);
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    if (!ne || !sw) {
      setLoadingMapData(false);
      return;
    }
    const params = { minLat: sw.lat(), maxLat: ne.lat(), minLng: sw.lng(), maxLng: ne.lng() };
    try {
      const response = await apiClient.get('/shops', { params });
      if (response.data?.success && Array.isArray(response.data.data)) {
        setShops(response.data.data);
      } else if (response.data?.success && response.data.data?.content) {
        setShops(response.data.data.content);
      } else {
        throw new Error(response.data?.message || '無法獲取店家');
      }
    } catch (err) {
      console.error('[HomePage] Error fetching shops:', err);
      setErrorMapData(err?.response?.data?.message || err?.message || '無法載入店家');
      setShops([]);
    } finally {
      setLoadingMapData(false);
    }
  }, []);

  // --- 地圖空閒回調 ---
  const handleMapIdle = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      if (bounds) fetchShopsInBounds(bounds);
    }
  }, [fetchShopsInBounds]);

  // --- Marker 點擊 / InfoWindow ---
  const handleMarkerClick = useCallback((shop) => {
    setSelectedShop(shop);
    if (mapRef.current && shop.latitude && shop.longitude) {
      const lat = parseFloat(shop.latitude), lng = parseFloat(shop.longitude);
      if (!isNaN(lat) && !isNaN(lng)) mapRef.current.panTo({ lat, lng });
    }
  }, []);
  const handleInfoWindowClose = useCallback(() => setSelectedShop(null), []);

  // --- 點擊外部關閉建議列表 ---
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- 搜尋輸入 ---
  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const handleSearchFocus = () => {
    if (searchQuery.trim() && searchResults.length) setShowSuggestions(true);
  };

  // --- 呼叫搜尋 API ---
  const fetchSearchResults = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }
    console.log(`[HomePage Debug] Fetching search results for: ${query}`); // 修正：用反引号
    setIsSearching(true);
    setSearchResults([]);
    setShowSuggestions(true);
    try {
      const response = await apiClient.get('/shops/search', { params: { query } });
      if (response.data?.success && Array.isArray(response.data.data)) {
        setSearchResults(response.data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('[HomePage] Search API error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // --- Debounce 搜尋 ---
  useEffect(() => {
    clearTimeout(debounceTimeoutRef.current);
    if (searchQuery.trim()) {
      debounceTimeoutRef.current = setTimeout(() => {
        fetchSearchResults(searchQuery);
      }, 500);
    } else {
      setSearchResults([]); setShowSuggestions(false); setIsSearching(false);
    }
    return () => clearTimeout(debounceTimeoutRef.current);
  }, [searchQuery, fetchSearchResults]);

  // --- 建議點擊 ---
  const handleSuggestionClick = useCallback((shop) => {
    if (!shop.latitude || !shop.longitude) return;
    const lat = parseFloat(shop.latitude), lng = parseFloat(shop.longitude);
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);
    }
    setSearchQuery(shop.name);
    setSearchResults([]);
    setShowSuggestions(false);
  }, []);

  // --- Marker 聚合 ---
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const clusterer = markerClustererRef.current;
    const next = {};
    shops.forEach((shop) => {
      const lat = parseFloat(shop.latitude), lng = parseFloat(shop.longitude);
      if (shop.id && !isNaN(lat) && !isNaN(lng)) {
        const key = String(shop.id);
        const pos = { lat, lng };
        if (markersRef.current[key]) {
          next[key] = markersRef.current[key];
          const old = markersRef.current[key].getPosition();
          if (old.lat() !== lat || old.lng() !== lng) {
            markersRef.current[key].setPosition(pos);
          }
        } else {
          const m = new window.google.maps.Marker({ position: pos, title: shop.name });
          m.addListener('click', () => handleMarkerClick(shop));
          next[key] = m;
        }
      }
    });
    const add = [], remove = [];
    Object.keys(next).forEach((k) => { if (!markersRef.current[k]) add.push(next[k]); });
    Object.keys(markersRef.current).forEach((k) => { if (!next[k]) remove.push(markersRef.current[k]); });
    if (clusterer) {
      if (remove.length) clusterer.removeMarkers(remove);
      if (add.length) clusterer.addMarkers(add);
    }
    markersRef.current = next;
  }, [shops, mapLoaded, handleMarkerClick]);

  // --- Render ---
  if (mapLoadError) return <div className="homepage"><div className="error-message">地圖載入失敗: {mapLoadError.message}</div></div>;
  if (!mapLoaded) return <div className="homepage"><div className="loading-message">地圖載入中...</div></div>;

  return (
    <div className="homepage">
      <div className="map-search-container" ref={searchContainerRef}>
        <input
          type="text"
          className="map-search-input"
          placeholder="搜尋拉麵店名或地址..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          autoComplete="off"
        />
        {showSuggestions && (
          <div className="search-suggestions-container">
            {isSearching ? <div className="search-loading">搜尋中...</div> : (
              searchResults.length > 0 ? (
                <ul className="search-suggestions-list">
                  {searchResults.map((shop) => (
                    <li key={shop.id} onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(shop); }}>
                      <span className="suggestion-name">{shop.name}</span>
                      {shop.address && <span className="suggestion-address"> - {shop.address}</span>}
                    </li>
                  ))}
                </ul>
              ) : <div className="search-no-results">找不到符合條件的店家</div>
            )}
          </div>
        )}
      </div>
      {loadingMapData && <div className="loading-overlay map-loading">更新店家標記中...</div>}
      {errorMapData && <div className="error-overlay map-error">錯誤: {errorMapData}</div>}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={8}
        options={defaultMapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        onIdle={handleMapIdle}
        onClick={handleInfoWindowClose}
      >
        {selectedShop && (
          <InfoWindow
            position={{ lat: parseFloat(selectedShop.latitude), lng: parseFloat(selectedShop.longitude) }}
            onCloseClick={handleInfoWindowClose}
            options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
          >
            <div className="info-window-content">
              <h4>{selectedShop.name}</h4>
              <p>{selectedShop.address}</p>
              <p className="info-window-rating">
                評分: {selectedShop.averageRating?.toFixed(1) ?? 'N/A'} / 5 ({selectedShop.reviewCount ?? 0} 則)
              </p>
              <Link to={`/shops/${selectedShop.id}`} className="info-window-link">查看詳情 →</Link>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

HomePage.propTypes = {
  // 不再接收 props，自己 loader
};

export default HomePage;