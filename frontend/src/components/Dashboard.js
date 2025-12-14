import React, { useState, useEffect } from 'react';
import api from '../services/api';
import SweetCard from './SweetCard';
import AddSweetModal from './AddSweetModal';
import EditSweetModal from './EditSweetModal';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [sweets, setSweets] = useState([]);
  const [filteredSweets, setFilteredSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSweet, setEditingSweet] = useState(null);

  const categories = [...new Set(sweets.map(sweet => sweet.category))];

  useEffect(() => {
    fetchSweets();
  }, []);

  useEffect(() => {
    filterSweets();
  }, [searchTerm, categoryFilter, minPrice, maxPrice, sweets]);

  const fetchSweets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sweets');
      setSweets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load sweets. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterSweets = () => {
    let filtered = [...sweets];

    if (searchTerm) {
      filtered = filtered.filter(sweet =>
        sweet.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(sweet => sweet.category === categoryFilter);
    }

    if (minPrice) {
      filtered = filtered.filter(sweet => sweet.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter(sweet => sweet.price <= parseFloat(maxPrice));
    }

    setFilteredSweets(filtered);
  };

  const handlePurchase = async (sweetId, quantity = 1) => {
    try {
      const response = await api.post(`/sweets/${sweetId}/purchase`, { quantity });
      setSuccess(`Successfully purchased ${quantity} item(s)!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchSweets();
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (sweetId) => {
    if (!window.confirm('Are you sure you want to delete this sweet?')) {
      return;
    }

    try {
      await api.delete(`/sweets/${sweetId}`);
      setSuccess('Sweet deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchSweets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete sweet.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRestock = async (sweetId, quantity) => {
    try {
      await api.post(`/sweets/${sweetId}/restock`, { quantity });
      setSuccess('Restocked successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchSweets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restock.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddSweet = async (sweetData) => {
    try {
      await api.post('/sweets', sweetData);
      setShowAddModal(false);
      setSuccess('Sweet added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchSweets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add sweet.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateSweet = async (sweetId, sweetData) => {
    try {
      await api.put(`/sweets/${sweetId}`, sweetData);
      setEditingSweet(null);
      setSuccess('Sweet updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchSweets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update sweet.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1>🍭 Sweet Shop Management</h1>
          <div className="header-actions">
            <span className="user-info">Welcome, {user.username}!</span>
            {user.isAdmin && <span className="admin-badge">Admin</span>}
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="card">
          <h2>Search & Filter</h2>
          <div className="filters">
            <div className="filter-group">
              <label>Search by Name</label>
              <input
                type="text"
                placeholder="Search sweets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Min Price</label>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="filter-group">
              <label>Max Price</label>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          </div>
        </div>

        {user.isAdmin && (
          <div className="card">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              + Add New Sweet
            </button>
          </div>
        )}

        <div className="sweets-section">
          <h2>
            Available Sweets ({filteredSweets.length})
            {loading && <span className="loading-text">Loading...</span>}
          </h2>

          {loading ? (
            <div className="loading-message">Loading sweets...</div>
          ) : filteredSweets.length === 0 ? (
            <div className="no-sweets">
              <p>No sweets found. {user.isAdmin && 'Add some sweets to get started!'}</p>
            </div>
          ) : (
            <div className="sweets-grid">
              {filteredSweets.map(sweet => (
                <SweetCard
                  key={sweet.id}
                  sweet={sweet}
                  isAdmin={user.isAdmin}
                  onPurchase={handlePurchase}
                  onDelete={handleDelete}
                  onEdit={() => setEditingSweet(sweet)}
                  onRestock={handleRestock}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSweetModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSweet}
        />
      )}

      {editingSweet && (
        <EditSweetModal
          sweet={editingSweet}
          onClose={() => setEditingSweet(null)}
          onUpdate={handleUpdateSweet}
        />
      )}
    </div>
  );
}

export default Dashboard;


