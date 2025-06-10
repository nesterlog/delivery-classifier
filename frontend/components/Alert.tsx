import React from 'react';

interface AlertProps {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  return (
    <div className={`alert alert-${type} mb-4`}>
      <div className="flex justify-between items-center">
        <div>{message}</div>
        {onClose && (
          <button
            type="button"
            className="text-gray hover:text-dark-gray"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert; 