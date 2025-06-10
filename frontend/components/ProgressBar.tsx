import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label, 
  showPercentage = true, 
  size = 'medium',
  color = 'primary'
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getHeight = () => {
    switch (size) {
      case 'small': return '4px';
      case 'large': return '12px';
      case 'medium':
      default: return '8px';
    }
  };

  const getColor = () => {
    switch (color) {
      case 'success': return 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
      case 'warning': return 'linear-gradient(90deg, #ffc107 0%, #fd7e14 100%)';
      case 'danger': return 'linear-gradient(90deg, #dc3545 0%, #e83e8c 100%)';
      case 'primary':
      default: return 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
    }
  };

  return (
    <div className="progress-container">
      {label && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '5px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>{label}</span>
          {showPercentage && <span>{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div 
        className="progress-bar"
        style={{ height: getHeight() }}
      >
        <div 
          className="progress-fill"
          style={{ 
            width: `${clampedProgress}%`,
            background: getColor(),
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar; 