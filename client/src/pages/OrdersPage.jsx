import React, { useState, useEffect } from 'react';
import { ordersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import {
  FileText,
  XCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function OrdersPage() {
  const { refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const filterTabs = [
    { label: 'All Orders', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Partially Filled', value: 'PARTIALLY_FILLED' },
    { label: 'Filled', value: 'FILLED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await ordersApi.getAll({ status: statusFilter });
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Execute cancellation
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      const res = await ordersApi.cancel(cancelTarget.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: 'Order cancelled successfully. Reserved funds or stock shares have been returned.',
        });
        setCancelTarget(null);
        await refreshUser();
        await fetchOrders();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel order.',
      });
      setCancelTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">
            Order Management
          </h1>
          <p className="page-subtitle">
            Track resting and completed limit orders. Cancel eligible open quotes anytime.
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          className="btn btn-secondary"
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          Refresh Orders
        </button>
      </div>

      {notification && (
        <div className={`glass-alert ${notification.type === 'success' ? 'glass-alert-success' : 'glass-alert-danger'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '13px', fontWeight: '500' }}>{notification.message}</span>
        </div>
      )}

      {/* Filter Tabs — Apple Liquid Glass Capsule Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`glass-pill ${statusFilter === tab.value ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading orders...
          </div>
        ) : orders.length > 0 ? (
          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Stock</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th className="numeric">Limit Price</th>
                  <th className="numeric">Quantity</th>
                  <th className="numeric">Filled</th>
                  <th className="numeric">Remaining</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {order.id.substring(0, 8)}...
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {order.symbol}
                      </span>
                    </td>
                    <td>
                      <StatusBadge side={order.side} />
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {order.orderType}
                      </span>
                    </td>
                    <td className="numeric" style={{ fontWeight: '600' }}>
                      ${order.limitPrice.toFixed(2)}
                    </td>
                    <td className="numeric">{order.quantity}</td>
                    <td className="numeric" style={{ color: order.filledQuantity > 0 ? 'var(--primary-green)' : 'inherit' }}>
                      {order.filledQuantity}
                    </td>
                    <td className="numeric" style={{ fontWeight: '600' }}>
                      {order.remainingQuantity}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {order.canCancel ? (
                        <button
                          onClick={() => setCancelTarget(order)}
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px' }}>
            <EmptyState
              icon={FileText}
              title={`No ${statusFilter !== 'ALL' ? statusFilter.toLowerCase().replace('_', ' ') : ''} orders found`}
              message="Submit a new limit order to participate in the simulation."
            />
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Order Confirmation"
        footer={
          <>
            <button
              onClick={() => setCancelTarget(null)}
              className="btn btn-secondary"
            >
              Keep Order
            </button>
            <button
              onClick={handleConfirmCancel}
              className="btn btn-danger"
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Are you sure you want to cancel this order?
        </p>

        {cancelTarget && (
          <div className="glass-panel" style={{
            padding: '16px',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Stock:</span>
              <strong>{cancelTarget.symbol}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Side:</span>
              <strong style={{ color: cancelTarget.side === 'BUY' ? 'var(--color-buy)' : 'var(--color-sell)' }}>{cancelTarget.side}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Remaining Shares:</span>
              <strong>{cancelTarget.remainingQuantity}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Limit Price:</span>
              <strong>${cancelTarget.limitPrice.toFixed(2)}</strong>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)', color: 'var(--primary-green)', fontWeight: '600' }}>
              {cancelTarget.side === 'BUY'
                ? `Will release $${(cancelTarget.remainingQuantity * cancelTarget.limitPrice).toFixed(2)} reserved cash immediately.`
                : `Will release ${cancelTarget.remainingQuantity} reserved shares back to available holdings.`}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

