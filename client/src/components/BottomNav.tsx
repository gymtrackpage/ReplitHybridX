import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'programs', label: 'Programs', icon: '💪' },
    { id: 'workouts', label: 'Workouts', icon: '🏃' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      padding: '8px 0',
      zIndex: 50
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        maxWidth: '640px',
        margin: '0 auto'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              fontSize: '12px'
            }}
          >
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}