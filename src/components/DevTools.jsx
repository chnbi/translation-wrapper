import React from 'react';
import { ROLES, getRoleLabel, getRoleColor } from '../lib/permissions';

export function DevTools({ currentRole, setCurrentRole }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'white',
            borderRadius: '9999px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            fontWeight: 500
        }}>
            <span style={{ color: '#6b7280' }}>Dev Role:</span>
            <button
                onClick={() => setCurrentRole(ROLES.MANAGER)}
                style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: currentRole === ROLES.MANAGER ? '#FF0084' : '#f3f4f6',
                    color: currentRole === ROLES.MANAGER ? 'white' : '#374151',
                    transition: 'all 0.2s'
                }}
            >
                Manager
            </button>
            <button
                onClick={() => setCurrentRole(ROLES.EDITOR)}
                style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: currentRole === ROLES.EDITOR ? '#3b82f6' : '#f3f4f6',
                    color: currentRole === ROLES.EDITOR ? 'white' : '#374151',
                    transition: 'all 0.2s'
                }}
            >
                Editor
            </button>
        </div>
    );
}
