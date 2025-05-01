// src/pages/ActivitiesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { getRecentActivities } from '../services/api';
import ActivityCard from '../components/ActivityCard';
import Pagination from '../components/Pagination';

const FILTER_TYPES = [
  { label: '全部',   value: 'ALL' },
  { label: '最新活動', value: 'EVENT' },
  { label: '最新評論', value: 'REVIEW' },
];

// 頁面大小選項，最小 10，最大 30
const PAGE_SIZE_OPTIONS = [10, 20, 30];

export default function ActivitiesPage() {
  const [activities, setActivities]     = useState([]);
  const [page, setPage]                 = useState(0);
  const [pageSize, setPageSize]         = useState(10);
  const [totalItems, setTotalItems]     = useState(0);
  const [filterType, setFilterType]     = useState('ALL');
  const [keyword, setKeyword]           = useState('');

  // 向後端拿分頁資料
  useEffect(() => {
    getRecentActivities(page, pageSize)
      .then(data => {
        setActivities(data.content || []);
        setTotalItems(data.totalElements || 0);
      })
      .catch(err => console.error('載入動態牆失敗', err));
  }, [page, pageSize]);

  // 前端過濾
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (filterType !== 'ALL' && act.activityType !== filterType) {
        return false;
      }
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const inTitle = act.headline?.toLowerCase().includes(kw);
        const inBody  = act.body?.toLowerCase().includes(kw);
        if (!inTitle && !inBody) return false;
      }
      return true;
    });
  }, [activities, filterType, keyword]);

  return (
    <div className="p-4">

      {/* 頁首 + 篩選 */}
      <h2 className="text-2xl font-bold mb-4">動態牆</h2>

      <div className="flex flex-wrap items-center mb-4 space-x-4">
        {/* 類型篩選 */}
        <select
          className="px-3 py-1 border rounded"
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(0); }}
        >
          {FILTER_TYPES.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>

        {/* 關鍵字搜尋 */}
        <input
          type="text"
          className="px-3 py-1 border rounded flex-1 min-w-[200px]"
          placeholder="搜尋標題或內文關鍵字"
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(0); }}
        />

        {/* 每頁筆數選單 */}
        <div className="flex items-center space-x-2">
          <label htmlFor="pageSize" className="text-gray-700">每頁顯示：</label>
          <select
            id="pageSize"
            className="px-2 py-1 border rounded"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}> {n} 筆</option>
            ))}
          </select>
          <small className="text-gray-500">（單次最多顯示 30 筆）</small>
        </div>
      </div>

      {/* 列表 or 無資料提示 */}
      {filteredActivities.length === 0 ? (
        <p className="text-gray-600">目前沒有符合條件的動態。</p>
      ) : (
        filteredActivities.map(act => (
          <ActivityCard
            key={`${act.activityType}-${act.id}`}
            activity={act}
          />
        ))
      )}

      {/* 分頁 */}
      <Pagination
        current={page}
        totalItems={totalItems}
        pageSize={pageSize}
        onChange={setPage}
      />
    </div>
  );
}