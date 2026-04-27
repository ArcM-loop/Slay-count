import React from 'react';

/**
 * PaperPlaneMarker - A reusable CSS 3D component for chart data points.
 * 
 * Deliverable: Single React component file with scoped CSS.
 * Aesthetic: Lightweight, 3D CSS geometry, Antigravity vibe.
 */
const PaperPlaneMarker = ({ className = "", style = {} }) => {
  return (
    <div className={`paper-plane-container ${className}`} style={style}>
      <style>{`
        .paper-plane-container {
          position: relative;
          width: 20px;
          height: 20px;
          perspective: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ── 3D Wrapper ── */
        .plane-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: floatPlane 2.5s ease-in-out infinite;
          transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
          pointer-events: none;
        }

        .plane-model {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotateX(-15deg) rotateY(40deg);
          transform-style: preserve-3d;
          width: 100%;
          height: 100%;
        }

        /* ── Paper Plane Geometry ── */
        .wing, .fold {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
          backface-visibility: visible;
        }

        /* Wings: Large triangular folds */
        .wing {
          clip-path: polygon(0 50%, 100% 0, 100% 100%);
          box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        }

        /* Body: Narrow central folds */
        .fold {
          clip-path: polygon(0 50%, 100% 44%, 100% 56%);
          background: #e5e5e5;
        }

        /* ── 3D Folds Positioning ── */
        .left-fold { transform-origin: left center; transform: rotateX(8deg); }
        .right-fold { transform-origin: left center; transform: rotateX(-8deg); }

        /* Left Wing: Folded up drastically */
        .wing.left {
          transform-origin: left center;
          transform: rotateX(82deg) translateY(-1px);
          filter: brightness(1.05);
        }

        /* Right Wing: Folded down drastically */
        .wing.right {
          transform-origin: left center;
          transform: rotateX(-82deg) translateY(1px);
          filter: brightness(0.95);
        }

        /* ── Shadow ── */
        .plane-shadow {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%) rotateX(75deg);
          width: 12px;
          height: 6px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 50%;
          filter: blur(2.5px);
          transition: all 0.5s ease;
          animation: pulseShadow 2.5s ease-in-out infinite;
        }

        /* ── Interactions (Hover) ── */
        .paper-plane-container:hover .plane-wrapper {
          transform: translateY(-10px) rotateX(35deg) scale(1.1);
        }

        .paper-plane-container:hover .plane-shadow {
          transform: translateX(-50%) rotateX(75deg) scale(0.5);
          opacity: 0.1;
          filter: blur(4px);
        }

        /* ── Animations ── */
        @keyframes floatPlane {
          0%, 100% { transform: translateY(0) rotateZ(0deg); }
          50% { transform: translateY(-3px) rotateZ(1deg); }
        }

        @keyframes pulseShadow {
          0%, 100% { transform: translateX(-50%) rotateX(75deg) scale(1); opacity: 0.2; }
          50% { transform: translateX(-50%) rotateX(75deg) scale(0.8); opacity: 0.15; }
        }
      `}</style>

      {/* Shadow */}
      <div className="plane-shadow"></div>
      
      {/* 3D Wrapper */}
      <div className="plane-wrapper">
        <div className="plane-model">
          <div className="wing left"></div>
          <div className="wing right"></div>
          <div className="fold left-fold"></div>
          <div className="fold right-fold"></div>
        </div>
      </div>
    </div>
  );
};

export default PaperPlaneMarker;
