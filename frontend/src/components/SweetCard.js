import React, { useState } from 'react';
import './SweetCard.css';

function SweetCard({ sweet, isAdmin, onPurchase, onDelete, onEdit, onRestock }) {
  const [restockQuantity, setRestockQuantity] = useState(10);
  const [showRestockInput, setShowRestockInput] = useState(false);

  const handlePurchaseClick = () => {
    onPurchase(sweet.id, 1);
  };

  const handleRestockSubmit = (e) => {
    e.preventDefault();
    if (restockQuantity > 0) {
      onRestock(sweet.id, parseInt(restockQuantity));
      setShowRestockInput(false);
      setRestockQuantity(10);
    }
  };

  return (
    <div className="sweet-card">
      <div className="sweet-header">
        <h3>{sweet.name}</h3>
        <span className="category-badge">{sweet.category}</span>
      </div>

      <div className="sweet-body">
        <div className="sweet-info">
          <div className="price">₹{sweet.price.toFixed(2)}</div>
          <div className={`quantity ${sweet.quantity === 0 ? 'out-of-stock' : ''}`}>
            {sweet.quantity === 0 ? 'Out of Stock' : `In Stock: ${sweet.quantity}`}
          </div>
        </div>

        <div className="sweet-actions">
          <button
            onClick={handlePurchaseClick}
            className="btn btn-primary"
            disabled={sweet.quantity === 0}
          >
            {sweet.quantity === 0 ? 'Out of Stock' : 'Purchase'}
          </button>

          {isAdmin && (
            <div className="admin-actions">
              <button onClick={onEdit} className="btn btn-secondary">
                Edit
              </button>
              <button onClick={() => onDelete(sweet.id)} className="btn btn-danger">
                Delete
              </button>
              {!showRestockInput ? (
                <button
                  onClick={() => setShowRestockInput(true)}
                  className="btn btn-success"
                >
                  Restock
                </button>
              ) : (
                <form onSubmit={handleRestockSubmit} className="restock-form">
                  <input
                    type="number"
                    min="1"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="restock-input"
                  />
                  <button type="submit" className="btn btn-success">
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRestockInput(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SweetCard;


