import React, { useState, useEffect } from 'react';
import './Modal.css';

function EditSweetModal({ sweet, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    quantity: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (sweet) {
      setFormData({
        name: sweet.name || '',
        category: sweet.category || '',
        price: sweet.price || '',
        quantity: sweet.quantity || ''
      });
    }
  }, [sweet]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const updateData = {};

    if (formData.name) updateData.name = formData.name;
    if (formData.category) updateData.category = formData.category;

    if (formData.price !== '') {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        setError('Price must be a valid non-negative number');
        return;
      }
      updateData.price = price;
    }

    if (formData.quantity !== '') {
      const quantity = parseInt(formData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        setError('Quantity must be a valid non-negative integer');
        return;
      }
      updateData.quantity = quantity;
    }

    if (Object.keys(updateData).length === 0) {
      setError('Please update at least one field');
      return;
    }

    onUpdate(sweet.id, updateData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Sweet</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter sweet name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Traditional, Modern, Chocolate"
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Sweet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSweetModal;


