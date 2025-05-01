// src/components/ActivityCard.jsx
import React from 'react';
import './ActivityCard.css';
import { Link } from 'react-router-dom';

export default function ActivityCard({ activity }) {
  return (
    <div className="activity-card">
      <div className="activity-header">
        <h4>
          {activity.activityType === 'EVENT'
            ? activity.headline
            : `新評論 by ${activity.reviewerName}`}
        </h4>
        <time>{new Date(activity.occurredAt).toLocaleString()}</time>
      </div>
      <div className="activity-body">
        <p>{activity.body}</p>
      </div>
      <div className="activity-footer">
        <Link to={`/shops/${activity.shopId}`}>查看店家</Link>
      </div>
    </div>
  );
}
