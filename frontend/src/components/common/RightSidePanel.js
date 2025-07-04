import React from 'react';
import PropTypes from 'prop-types';
import { FaTimes } from 'react-icons/fa';
import './RightSidePanel.css';

const RightSidePanel = ({ show, title, onClose, children, width = 400, className = '' }) => {
  if (!show) return null;
  return (
    <aside
      className={`right-side-panel ${className}`}
      style={{
        // width: width,
        // boxShadow: 'rgba(0,0,0,0.12) -4px 0 24px',
      }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="right-side-panel-header">
        <div className="right-side-panel-title">{title}</div>
        <button className="right-side-panel-close" onClick={onClose} aria-label="Close panel">
          <FaTimes />
        </button>
      </div>
      <div className="right-side-panel-body">
        {children}
      </div>
    </aside>
  );
};

RightSidePanel.propTypes = {
  show: PropTypes.bool.isRequired,
  title: PropTypes.node,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  width: PropTypes.number,
  className: PropTypes.string,
};

export default RightSidePanel; 