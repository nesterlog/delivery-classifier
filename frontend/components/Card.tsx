import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', id }) => {
  return (
    <div className={`card ${className}`} id={id}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card; 