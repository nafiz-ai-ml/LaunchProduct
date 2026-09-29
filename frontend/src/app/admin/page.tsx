'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sliders,
  FileText,
  Activity,
  UserCheck,
  Lock,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  Send,
  X,
  Radio,
  Flame,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getSessionUser } from '@/lib/auth-client';
import { User, UserRole } from '@/types';

// ==========================================
// Types & Interfaces
// ==========================================

interface PendingProduct {
  productId: string;
  name: string;
  slug: string;
  canonicalDomain?: string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  submittedById?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  } | string;
  status: string;
  submittedAt: string;
  media?: {
    logoUrl?: string;
    bannerUrl?: string;
  };
}

interface FlaggedVote {
  voteId: string;
  productId: string;
  voterUserId: string;
  status: string;
  riskAssessment?: {
    riskScore: number;
    riskSignals: string[];
    asnNumber?: number;
    notes?: string;
  };
  createdAt: string;
}

interface SystemSetting {
  _id?: string;
  key: string;
  value: any;
  description?: string;
  updatedAt?: string;
}

interface AuditLog {
  id: string;
  source: 'MODERATION' | 'ACTIVITY';
  actor?: any;
  action: string;
  targetType: string;
  targetId?: any;
  reason?: string | null;
  metadata?: any;
  createdAt: string;
}

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error';
}

type AdminTab = 'pending_products' | 'flagged_votes' | 'system_settings' | 'audit_log';

export default function AdminModerationPage() {
  const router = useRouter();

  // Authentication & Access State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('pending_products');

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(true);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Tab 1: Pending Products Queue
  const [pendingQueue, setPendingQueue] = useState<PendingProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Rejection Modal State
  const [rejectionModalProduct, setRejectionModalProduct] = useState<PendingProduct | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Tab 2: Flagged Votes
  const [flaggedVotes, setFlaggedVotes] = useState<FlaggedVote[]>([]);

  // Tab 3: System Settings
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [isSavingSetting, setIsSavingSetting] = useState<string | null>(null);
  const [isRecomputingLeaderboard, setIsRecomputingLeaderboard] = useState(false);

  // Tab 4: Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<'all' | 'MODERATION' | 'ACTIVITY'>('all');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  async function handleClaimAdmin() {
    setIsClaimingAdmin(true);
    try {
      const res = await apiClient.post('/auth/claim-admin');
      if (res.data?.success) {
        showToast('Admin Role Granted!', 'Your account has been elevated to ADMIN.', 'success');
        if (currentUser) {
          setCurrentUser({ ...currentUser, role: 'ADMIN' });
        }
        setIsStaff(true);
        await loadAllData();
      }
    } catch (err: any) {
      showToast('Elevation Failed', err?.message || 'Failed to claim admin.', 'error');
    } finally {
      setIsClaimingAdmin(false);
    }
  }

  // ==========================================
  // Auth Verification & Staff Check
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAuth() {
      try {
        const user = await getSessionUser();
        if (!isMounted) return;

        if (!user) {
          router.replace('/auth?redirect=/admin');
          return;
        }

        setCurrentUser(user);

        // Check for MODERATOR or ADMIN role
        const allowedRoles: UserRole[] = ['MODERATOR', 'ADMIN'];
        if (allowedRoles.includes(user.role)) {
          setIsStaff(true);
          await loadAllData();
        } else {
          setIsStaff(false);
        }
      } catch (err) {
        if (isMounted) {
          router.replace('/auth?redirect=/admin');
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
          setIsLoading(false);
        }
      }
    }

    verifyAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // ==========================================
  // Data Fetching
  // ==========================================
  async function loadAllData() {
    setIsLoading(true);
    await Promise.allSettled([
      fetchPendingProducts(),
      fetchFlaggedVotes(),
      fetchSystemSettings(),
      fetchAuditLogs(),
    ]);
    setIsLoading(false);
  }

  async function fetchPendingProducts() {
    try {
      const res = await apiClient.get('/moderation/queue/products?limit=50');
      const queue = res.data?.data?.queue;
      setPendingQueue(Array.isArray(queue) ? queue : []);
    } catch (err: any) {
      console.warn('Failed to load pending products queue:', err?.message);
    }
  }

  async function fetchFlaggedVotes() {
    try {
      const res = await apiClient.get('/moderation/queue/votes?limit=50');
      const votes = res.data?.data?.flaggedVotes;
      setFlaggedVotes(Array.isArray(votes) ? votes : []);
    } catch (err: any) {
      console.warn('Failed to load flagged votes queue:', err?.message);
    }
  }

  async function fetchSystemSettings() {
    try {
      const res = await apiClient.get('/admin/settings');
      const data = res.data?.data?.settings;
      if (Array.isArray(data)) {
        setSettings(data);
        // Pre-populate editing map
        const initialMap: Record<string, string> = {};
        data.forEach((s) => {
          initialMap[s.key] = typeof s.value === 'object' ? JSON.stringify(s.value, null, 2) : String(s.value);
        });
        setEditingSettings(initialMap);
      }
    } catch (err: any) {
      console.warn('Failed to load system settings:', err?.message);
    }
  }

  async function fetchAuditLogs() {
    try {
      // Tries /moderation/audit-logs first, fallbacks to /admin/audit-logs
      let res: any;
      try {
        res = await apiClient.get('/moderation/audit-logs?limit=40');
      } catch {
        res = await apiClient.get('/admin/audit-logs?limit=40');
      }
      const logs = res.data?.data?.logs;
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.warn('Failed to load audit logs:', err?.message);
    }
  }

  // ==========================================
  // Moderation Actions
  // ==========================================

  // 1. Approve Product
  async function handleApproveProduct(product: PendingProduct) {
    try {
      setActionProcessingId(product.productId);
      const res = await apiClient.patch(`/moderation/products/${product.productId}/approve`);
      if (res.data?.success) {
        showToast('Product Approved!', `"${product.name}" is now published and live.`, 'success');
        setPendingQueue((prev) => prev.filter((p) => p.productId !== product.productId));
        // Refresh audit logs
        fetchAuditLogs();
      }
    } catch (err: any) {
      // Fallback to POST if server prefers POST
      try {
        const fallbackRes = await apiClient.post(`/moderation/products/${product.productId}/approve`);
        if (fallbackRes.data?.success) {
          showToast('Product Approved!', `"${product.name}" is now published and live.`, 'success');
          setPendingQueue((prev) => prev.filter((p) => p.productId !== product.productId));
          fetchAuditLogs();
          return;
        }
      } catch {
        showToast('Approval Failed', err?.message || 'Unable to approve product.', 'error');
      }
    } finally {
      setActionProcessingId(null);
    }
  }

  // 2. Reject Product
  async function handleConfirmReject() {
    if (!rejectionModalProduct) return;
    if (!rejectionReason.trim()) {
      showToast('Reason Required', 'Please enter a clear rejection explanation for the founder.', 'error');
      return;
    }

    try {
      setIsRejecting(true);
      const prodId = rejectionModalProduct.productId;
      const payload = { reason: rejectionReason.trim() };

      let success = false;
      try {
        const res = await apiClient.patch(`/moderation/products/${prodId}/reject`, payload);
        success = !!res.data?.success;
      } catch {
        const resPost = await apiClient.post(`/moderation/products/${prodId}/reject`, payload);
        success = !!resPost.data?.success;
      }

      if (success) {
        showToast('Product Rejected', `"${rejectionModalProduct.name}" rejected with feedback sent.`, 'info');
        setPendingQueue((prev) => prev.filter((p) => p.productId !== prodId));
        setRejectionModalProduct(null);
        setRejectionReason('');
        fetchAuditLogs();
      }
    } catch (err: any) {
      showToast('Rejection Failed', err?.message || 'Unable to reject product.', 'error');
    } finally {
      setIsRejecting(false);
    }
  }

  // 3. Approve Flagged Vote
  async function handleApproveVote(vote: FlaggedVote) {
    try {
      setActionProcessingId(vote.voteId);
      const res = await apiClient.post(`/moderation/votes/${vote.voteId}/approve`);
      if (res.data?.success) {
        showToast('Vote Validated', `Vote restored to active leaderboard tally.`, 'success');
        setFlaggedVotes((prev) => prev.filter((v) => v.voteId !== vote.voteId));
        fetchAuditLogs();
      }
    } catch (err: any) {
      showToast('Vote Action Failed', err?.message || 'Unable to validate vote.', 'error');
    } finally {
      setActionProcessingId(null);
    }
  }

  // 4. Reject Flagged Vote
  async function handleRejectVote(vote: FlaggedVote) {
    try {
      setActionProcessingId(vote.voteId);
      const res = await apiClient.post(`/moderation/votes/${vote.voteId}/reject`, {
        reason: 'Confirmed automated / Sybil vote pattern',
      });
      if (res.data?.success) {
        showToast('Vote Quarantined', `Vote marked rejected and excluded from ranking.`, 'info');
        setFlaggedVotes((prev) => prev.filter((v) => v.voteId !== vote.voteId));
        fetchAuditLogs();
      }
    } catch (err: any) {
      showToast('Vote Rejection Failed', err?.message || 'Unable to reject vote.', 'error');
    } finally {
      setActionProcessingId(null);
    }
  }

  // 5. Save System Setting
  async function handleSaveSetting(key: string) {
    try {
      setIsSavingSetting(key);
      const rawVal = editingSettings[key];
      let parsedValue: any = rawVal;
      try {
        parsedValue = JSON.parse(rawVal);
      } catch {
        // Keep string or number as-is
        if (!isNaN(Number(rawVal)) && rawVal.trim() !== '') {
          parsedValue = Number(rawVal);
        }
      }

      const res = await apiClient.patch(`/admin/settings/${key}`, { value: parsedValue });
      if (res.data?.success) {
        showToast('Setting Saved!', `Parameter "${key}" updated successfully.`, 'success');
        fetchSystemSettings();
        fetchAuditLogs();
      }
    } catch (err: any) {
      showToast('Save Failed', err?.message || 'Could not update setting.', 'error');
    } finally {
      setIsSavingSetting(null);
    }
  }

  // 6. Manual Leaderboard Recomputation
  async function handleRecomputeLeaderboard() {
    try {
      setIsRecomputingLeaderboard(true);
      const res = await apiClient.post('/admin/leaderboard/recompute');
      if (res.data?.success) {
        showToast(
          'Recompute Triggered!',
          `Leaderboard calculation enqueued in BullMQ worker (Job ID: ${res.data?.data?.jobId || 'OK'}).`,
          'success'
        );
        fetchAuditLogs();
      }
    } catch (err: any) {
      showToast('Recomputation Error', err?.message || 'Unable to trigger leaderboard recompute.', 'error');
    } finally {
      setIsRecomputingLeaderboard(false);
    }
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return pendingQueue;
    const term = productSearch.toLowerCase();
    return pendingQueue.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tagline?.toLowerCase().includes(term) ||
        p.canonicalDomain?.toLowerCase().includes(term) ||
        (typeof p.submittedById === 'object' && p.submittedById?.email?.toLowerCase().includes(term))
    );
  }, [pendingQueue, productSearch]);

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    if (auditFilter === 'all') return auditLogs;
    return auditLogs.filter((l) => l.source === auditFilter);
  }, [auditLogs, auditFilter]);

  // ==========================================
  // Render: Checking Authentication
  // ==========================================
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-electric/30 border-t-brand-electric rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: 403 Forbidden Access Page
  // ==========================================
  if (!isStaff) {
    return (
      <div className="min-h-[85vh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-3">
            403 — Forbidden Access
          </span>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Restricted Staff Portal
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            The Admin Moderation Console is strictly restricted to platform staff with{' '}
            <span className="font-semibold text-slate-900 dark:text-white">MODERATOR</span> or{' '}
            <span className="font-semibold text-slate-900 dark:text-white">ADMIN</span> privileges.
          </p>

          <div className="my-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Authenticated Account:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                {currentUser?.email || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Your Current Role:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {currentUser?.role || 'VISITOR'}
              </span>
            </div>
          </div>

          {/* 1-Click Promote to Admin Card */}
          <div className="mt-4 mb-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Platform Owner</span>
            </div>
            <h4 className="text-sm font-bold text-text-primary">
              Elevate Account to Administrator
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              If you are testing or administering this platform, click below to immediately grant this account full ADMIN access.
            </p>
            <button
              type="button"
              onClick={handleClaimAdmin}
              disabled={isClaimingAdmin}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isClaimingAdmin ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Elevating to ADMIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Promote This Account to ADMIN</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Return Home
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Authorized Staff Console
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      {/* Toast Notification Layer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-white'
                : toast.type === 'info'
                ? 'bg-sky-950/90 border-sky-800 text-white'
                : 'bg-emerald-950/90 border-emerald-800 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <AlertTriangle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-sm leading-tight">{toast.title}</h4>
              {toast.description && <p className="mt-1 opacity-90">{toast.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Top Banner / Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-electric/10 text-brand-electric border border-brand-electric/20 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Platform Governance & Integrity</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Admin Moderation Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Review pending submissions, inspect anti-fraud signals, tune platform weights, and inspect immutable audit logs.
              </p>
            </div>

            {/* Staff User Badge & Action */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                <div className="w-7 h-7 rounded-lg bg-brand-electric/20 text-brand-electric font-bold text-xs flex items-center justify-center">
                  {(currentUser?.name || currentUser?.email || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white leading-none">
                    {currentUser?.name || currentUser?.email?.split('@')[0]}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {currentUser?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 transition-all shadow-sm"
                title="Refresh All Queues"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 mt-6 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <button
              onClick={() => setActiveTab('pending_products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'pending_products'
                  ? 'bg-brand-electric text-white shadow-md shadow-brand-electric/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Pending Products</span>
              {pendingQueue.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'pending_products'
                      ? 'bg-white text-brand-electric'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {pendingQueue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('flagged_votes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'flagged_votes'
                  ? 'bg-brand-electric text-white shadow-md shadow-brand-electric/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Flagged Votes & Fraud</span>
              {flaggedVotes.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'flagged_votes'
                      ? 'bg-white text-brand-electric'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {flaggedVotes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('system_settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'system_settings'
                  ? 'bg-brand-electric text-white shadow-md shadow-brand-electric/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>System Settings & Toggles</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_log')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'audit_log'
                  ? 'bg-brand-electric text-white shadow-md shadow-brand-electric/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Audit Log Feed</span>
              {auditLogs.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Console Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ========================================================= */}
        {/* TAB 1: PENDING PRODUCTS QUEUE */}
        {/* ========================================================= */}
        {activeTab === 'pending_products' && (
          <div className="space-y-6">
            {/* Table Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name, domain, or submitter email..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-electric/40"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Showing</span>
                <span className="font-bold text-slate-900 dark:text-white">{filteredProducts.length}</span>
                <span>pending submissions</span>
              </div>
            </div>

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Queue Clear — All Products Reviewed
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  There are no pending product submissions waiting in the FIFO moderation triage queue right now.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Product & Domain</th>
                        <th className="px-6 py-4">Submitter</th>
                        <th className="px-6 py-4">Tagline & Summary</th>
                        <th className="px-6 py-4 text-center">Submitted At</th>
                        <th className="px-6 py-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
                      {filteredProducts.map((p) => {
                        const submitterEmail =
                          typeof p.submittedById === 'object'
                            ? p.submittedById?.email || p.submittedById?.name || 'Anonymous'
                            : p.submittedById || 'N/A';
                        const isProcessing = actionProcessingId === p.productId;

                        return (
                          <tr
                            key={p.productId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Product & Domain */}
                            <td className="px-6 py-4 align-top">
                              <div className="flex items-start gap-3">
                                {p.media?.logoUrl ? (
                                  <img
                                    src={p.media.logoUrl}
                                    alt={p.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-brand-electric/10 text-brand-electric font-black text-sm flex items-center justify-center border border-brand-electric/20 shrink-0">
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{p.name}</span>
                                    {p.canonicalDomain && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                        {p.canonicalDomain}
                                      </span>
                                    )}
                                  </div>
                                  {p.websiteUrl && (
                                    <a
                                      href={p.websiteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-brand-electric hover:underline mt-0.5"
                                    >
                                      <span className="truncate max-w-[180px]">{p.websiteUrl}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Submitter */}
                            <td className="px-6 py-4 align-top">
                              <div className="text-xs">
                                <span className="font-medium text-slate-900 dark:text-white block">
                                  {submitterEmail}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {p.productId.substring(0, 8)}...
                                </span>
                              </div>
                            </td>

                            {/* Tagline & Scraped AI Summary */}
                            <td className="px-6 py-4 align-top max-w-sm">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                  {p.tagline || 'No tagline provided'}
                                </p>
                                {p.description && (
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-brand-electric" /> Scraped Summary
                                    </span>
                                    {p.description}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Submitted At */}
                            <td className="px-6 py-4 align-top text-center">
                              <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                                {new Date(p.submittedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>

                            {/* Moderation Actions */}
                            <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveProduct(p)}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                  title="Approve & Publish Live"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve & Go Live</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectionModalProduct(p);
                                    setRejectionReason('');
                                  }}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50"
                                  title="Reject with Feedback"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject with Reason</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FLAGGED VOTES & ANTI-FRAUD SIGNALS */}
        {/* ========================================================= */}
        {activeTab === 'flagged_votes' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Quarantined Votes & Multi-Factor Anti-Fraud Signals</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Votes automatically flagged by the 6-factor risk engine (subnet density, velocity bursts, ASN reputation, proxy).
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>{flaggedVotes.length} Quarantined Signals</span>
              </div>
            </div>

            {flaggedVotes.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Zero Quarantined Votes Detected
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  The anti-fraud engine has processed all incoming voting telemetry with high integrity. No anomalies pending manual review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {flaggedVotes.map((v) => {
                  const score = v.riskAssessment?.riskScore || 50;
                  const isHighRisk = score >= 70;
                  const isProcessing = actionProcessingId === v.voteId;

                  return (
                    <div
                      key={v.voteId}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Vote: #{v.voteId.substring(0, 8)}
                        </span>
                        <div
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                            isHighRisk
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          Risk: {score}/100
                        </div>
                      </div>

                      {/* Vote Information */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target Product:</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white truncate max-w-[160px]">
                            {v.productId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Voter User:</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white truncate max-w-[160px]">
                            {v.voterUserId}
                          </span>
                        </div>
                        {v.riskAssessment?.asnNumber && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">ASN / Network:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              AS{v.riskAssessment.asnNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Risk Signals Badges */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Triggered Risk Signals
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {v.riskAssessment?.riskSignals && v.riskAssessment.riskSignals.length > 0 ? (
                            v.riskAssessment.riskSignals.map((sig, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                              >
                                {sig}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Velocity spike threshold</span>
                          )}
                        </div>
                      </div>

                      {/* Moderator Decision Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                        <button
                          onClick={() => handleApproveVote(v)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 text-center"
                        >
                          Approve (Valid)
                        </button>
                        <button
                          onClick={() => handleRejectVote(v)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 px-3 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50 text-center"
                        >
                          Quarantine
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SYSTEM SETTINGS & TOGGLES */}
        {/* ========================================================= */}
        {activeTab === 'system_settings' && (
          <div className="space-y-6">
            {/* Header + Manual Leaderboard Recompute Trigger */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-electric" />
                  <span>Platform Parameters & Ranking Formula Weights</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adjust leaderboard decay gravity, multi-factor anti-fraud thresholds, and inventory concurrency limits.
                </p>
              </div>

              <button
                onClick={handleRecomputeLeaderboard}
                disabled={isRecomputingLeaderboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Cpu className={`w-4 h-4 ${isRecomputingLeaderboard ? 'animate-spin' : ''}`} />
                <span>Recompute Leaderboard Now</span>
              </button>
            </div>

            {/* Settings Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {settings.map((setting) => {
                const isSaving = isSavingSetting === setting.key;
                return (
                  <div
                    key={setting.key}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-electric/10 text-brand-electric">
                          {setting.key}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {setting.updatedAt ? new Date(setting.updatedAt).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {setting.description || 'System Configuration'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Edit raw JSON or numeric value to update platform runtime parameters:
                      </p>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        rows={6}
                        value={editingSettings[setting.key] || ''}
                        onChange={(e) =>
                          setEditingSettings((prev) => ({
                            ...prev,
                            [setting.key]: e.target.value,
                          }))
                        }
                        className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-electric/40"
                      />

                      <button
                        onClick={() => handleSaveSetting(setting.key)}
                        disabled={isSaving}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all disabled:opacity-50 text-center"
                      >
                        {isSaving ? 'Updating Parameter...' : 'Save Configuration'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: LIVE AUDIT LOG FEED */}
        {/* ========================================================= */}
        {activeTab === 'audit_log' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <span>Immutable Governance Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Append-only ledger of every moderator decision, approval, rejection, and critical platform event.
                </p>
              </div>

              {/* Source Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['all', 'MODERATION', 'ACTIVITY'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAuditFilter(filter)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      auditFilter === filter
                        ? 'bg-white dark:bg-slate-900 text-brand-electric shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'All Events' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Log Stream */}
            {filteredLogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  No Audit Records Found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Actions taken in this moderation session will stream here automatically.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const isModeration = log.source === 'MODERATION';
                  const actorEmail =
                    typeof log.actor === 'object'
                      ? log.actor?.email || log.actor?.name || 'Staff'
                      : log.actor || 'System';

                  return (
                    <div
                      key={log.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isModeration
                              ? 'bg-brand-electric/10 text-brand-electric border border-brand-electric/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          {isModeration ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isModeration
                                  ? 'bg-brand-electric/10 text-brand-electric'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              by {actorEmail}
                            </span>
                            <span className="text-xs text-slate-400">→</span>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                              {log.targetType} ({typeof log.targetId === 'string' ? log.targetId.substring(0, 8) : 'Entity'})
                            </span>
                          </div>

                          {log.reason && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{log.reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* REJECTION REASON MODAL */}
      {/* ========================================================= */}
      {rejectionModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reject Product Submission
                  </h3>
                  <p className="text-xs text-slate-500">
                    Product: <span className="font-semibold text-slate-900 dark:text-white">{rejectionModalProduct.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectionModalProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reason Presets */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Reason Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Incomplete metadata or placeholder content',
                  'Broken or inaccessible canonical URL',
                  'Violates LaunchProduct terms or spam',
                  'Duplicate of existing registered product',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="text-left text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-electric/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 transition-colors leading-tight"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Explanation Textarea */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Feedback for Founder <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Provide constructive feedback explaining why this submission was rejected and how the founder can fix it..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-electric/40"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectionModalProduct(null)}
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
