import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, TABLES } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';
import { useToast } from '@/components/ui';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import {
  BookOpen,
  Users,
  Building2,
  Award,
  Tag,
  DollarSign,
  Gift,
  FileEdit,
  Search,
  ChevronRight,
  Shield,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  Edit,
  Plus,
  X,
  Key,
  RefreshCw,
  ChevronDown,
  CreditCard,
  Mail,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'licenses', label: 'Licenses', icon: Key },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
];

const ROLES = [
  { value: 'learner', label: 'Learner', color: 'bg-gray-100 text-gray-700' },
  { value: 'instructor', label: 'Instructor', color: 'bg-blue-100 text-blue-700' },
  { value: 'corporate_admin', label: 'Corporate Admin', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin', label: 'Admin', color: 'bg-orange-100 text-orange-700' },
  { value: 'system_admin', label: 'System Admin', color: 'bg-red-100 text-red-700' },
];

const PLANS = [
  { value: 'free_trial', label: 'Free Trial', color: 'bg-gray-100 text-gray-600' },
  { value: 'starter', label: 'Starter', color: 'bg-blue-100 text-blue-700' },
  { value: 'pro', label: 'Pro', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'premium', label: 'Premium', color: 'bg-amber-100 text-amber-700' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-emerald-100 text-emerald-700' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const ACCOUNT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
];

function getRoleBadge(role) {
  const found = ROLES.find((r) => r.value === role);
  return found || { label: role || 'Unknown', color: 'bg-gray-100 text-gray-600' };
}

function getPlanBadge(plan) {
  const found = PLANS.find((p) => p.value === plan);
  return found || { label: plan || 'None', color: 'bg-gray-100 text-gray-600' };
}

// ─── Add / Edit User Modal ─────────────────────────────────────
function UserModal({ isOpen, onClose, user, organizations, onSave, saving }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'learner',
    account_type: 'individual',
    subscription_plan: 'free_trial',
    status: 'active',
    organization_id: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'learner',
        account_type: user.account_type || 'individual',
        subscription_plan: user.subscription_plan || 'free_trial',
        status: user.status || 'active',
        organization_id: user.organization?.id || user.organization_id || '',
      });
    } else {
      setForm({
        email: '',
        first_name: '',
        last_name: '',
        role: 'learner',
        account_type: 'individual',
        subscription_plan: 'free_trial',
        status: 'active',
        organization_id: '',
      });
    }
  }, [user, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, user?.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="default">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={isEdit}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="john@example.com"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed after creation</p>
          )}
        </div>

        {/* Role & Status row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Account Type & Plan */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={form.account_type}
              onChange={(e) => handleChange('account_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License / Plan</label>
            <select
              value={form.subscription_plan}
              onChange={(e) => handleChange('subscription_plan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Organization */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization (optional)</label>
          <select
            value={form.organization_id}
            onChange={(e) => handleChange('organization_id', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">— No organization —</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !form.email.trim()}>
            {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Bulk License Modal ────────────────────────────────────────
function BulkLicenseModal({ isOpen, onClose, users, onApply, saving }) {
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
      setSearch('');
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(term) ||
        (u.first_name || '').toLowerCase().includes(term) ||
        (u.last_name || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    const ids = filteredUsers.map((u) => u.id);
    setSelectedUsers((prev) => (prev.length === ids.length ? [] : ids));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Licenses in Bulk" size="default">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan to Assign</label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Users ({selectedUsers.length} selected)
            </label>
            <button type="button" onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800">
              {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {u.first_name || u.last_name
                      ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                      : u.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadge(u.subscription_plan).color}`}>
                  {getPlanBadge(u.subscription_plan).label}
                </span>
              </label>
            ))}
            {filteredUsers.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">No users found</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onApply(selectedUsers, selectedPlan)}
            disabled={saving || selectedUsers.length === 0}
          >
            {saving
              ? 'Applying...'
              : `Assign ${getPlanBadge(selectedPlan).label} to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { success, error: showError } = useToast();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;
  const successRef = useRef(success);
  successRef.current = success;

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkLicenseOpen, setBulkLicenseOpen] = useState(false);

  // Filter state for users
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ─── Data loading ──────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [coursesRes, profilesRes, orgsRes, enrollmentsRes, freeTrialRes, categoriesRes] =
        await Promise.all([
          supabase.from(TABLES.COURSES).select('id', { count: 'exact', head: true }),
          supabase.from(TABLES.PROFILES).select('id', { count: 'exact', head: true }),
          supabase.from(TABLES.ORGANIZATIONS).select('id', { count: 'exact', head: true }),
          supabase.from(TABLES.COURSE_ENROLLMENTS).select('id', { count: 'exact', head: true }),
          supabase.from(TABLES.COURSES).select('id', { count: 'exact', head: true }).eq('is_free_trial', true),
          supabase.from(TABLES.COURSE_CATEGORIES).select('id', { count: 'exact', head: true }),
        ]);

      setStats({
        courses: coursesRes.count ?? 0,
        users: profilesRes.count ?? 0,
        organizations: orgsRes.count ?? 0,
        enrollments: enrollmentsRes.count ?? 0,
        freeTrialCourses: freeTrialRes.count ?? 0,
        categories: categoriesRes.count ?? 0,
      });
    } catch {
      showErrorRef.current('Failed to load dashboard stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const selectFields = 'id, email, first_name, last_name, role, account_type, status, subscription_plan, created_at, organization_id';

      let query = supabase
        .from(TABLES.PROFILES)
        .select(`${selectFields}, organization:organization_id(id, name)`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (userSearch.trim()) {
        query = query.or(`email.ilike.%${userSearch}%,first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%`);
      }

      let { data, error } = await query;

      if (error) {
        let fallback = supabase
          .from(TABLES.PROFILES)
          .select(selectFields)
          .order('created_at', { ascending: false })
          .limit(100);

        if (userSearch.trim()) {
          fallback = fallback.or(`email.ilike.%${userSearch}%,first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%`);
        }

        const result = await fallback;
        if (result.error) throw result.error;
        data = result.data;
      }

      setUsers(data || []);
    } catch {
      showErrorRef.current('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch]);

  const loadOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      let query = supabase
        .from(TABLES.ORGANIZATIONS)
        .select('id, name, slug, email, domain, subscription_status, max_employees, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (orgSearch.trim()) {
        query = query.or(`name.ilike.%${orgSearch}%,email.ilike.%${orgSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrganizations(data || []);
    } catch {
      showErrorRef.current('Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  }, [orgSearch]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'licenses') loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'organizations' || activeTab === 'users') loadOrganizations();
  }, [activeTab, loadOrganizations]);

  // ─── Filtered users ────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (planFilter !== 'all' && u.subscription_plan !== planFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, roleFilter, planFilter, statusFilter]);

  // ─── License stats ─────────────────────────────────────
  const licenseStats = useMemo(() => {
    const counts = {};
    for (const p of PLANS) counts[p.value] = 0;
    for (const u of users) {
      const plan = u.subscription_plan || 'free_trial';
      if (counts[plan] !== undefined) counts[plan]++;
      else counts[plan] = 1;
    }
    return counts;
  }, [users]);

  // ─── User CRUD ─────────────────────────────────────────
  const handleSaveUser = async (form, userId) => {
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        role: form.role,
        account_type: form.account_type,
        subscription_plan: form.subscription_plan,
        status: form.status,
        organization_id: form.organization_id || null,
      };

      if (userId) {
        const { data, error } = await supabase
          .from(TABLES.PROFILES)
          .update(payload)
          .eq('id', userId)
          .select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Update blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
        successRef.current('User updated successfully');
      } else {
        payload.email = form.email;
        const { data, error } = await supabase
          .from(TABLES.PROFILES)
          .insert([payload])
          .select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Insert blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
        successRef.current('User created successfully');
      }

      setUserModalOpen(false);
      setEditingUser(null);
      loadUsers();
      loadStats();
    } catch (err) {
      showError(err?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .delete()
        .eq('id', deleteConfirm.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Delete blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
      successRef.current('User deleted successfully');
      setDeleteConfirm(null);
      loadUsers();
      loadStats();
    } catch (err) {
      showError(err?.message || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineRoleChange = async (userId, newRole) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update({ role: newRole })
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
      successRef.current(`Role updated to ${getRoleBadge(newRole).label}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      showError(err?.message || 'Failed to update role');
    }
  };

  const handleInlinePlanChange = async (userId, plan) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update({ subscription_plan: plan })
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
      successRef.current(`License updated to ${getPlanBadge(plan).label}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, subscription_plan: plan } : u))
      );
    } catch (err) {
      showError(err?.message || 'Failed to update license');
    }
  };

  const handleInlineStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update({ status: newStatus })
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
      successRef.current(`Status changed to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch {
      showError('Failed to update status');
    }
  };

  const handleBulkLicense = async (userIds, plan) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update({ subscription_plan: plan })
        .in('id', userIds)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update blocked by database policy. Run the admin RLS migration in Supabase SQL Editor.');
      successRef.current(`${getPlanBadge(plan).label} license assigned to ${data.length} user${data.length !== 1 ? 's' : ''}`);
      setBulkLicenseOpen(false);
      loadUsers();
    } catch (err) {
      showError(err?.message || 'Failed to assign licenses');
    } finally {
      setSaving(false);
    }
  };

  // ─── Quick links & stat tiles ──────────────────────────
  const quickLinks = [
    { label: 'Manage Courses', icon: FileEdit, path: '/app/courses/management', color: 'bg-blue-500' },
    { label: 'Categories', icon: Tag, path: '/app/courses/categories', color: 'bg-purple-500' },
    { label: 'Certificate Templates', icon: Award, path: '/app/courses/certificate-templates', color: 'bg-amber-500' },
    { label: 'Course Catalog', icon: BookOpen, path: '/app/courses/catalog', color: 'bg-green-500' },
    { label: 'Pricing Page', icon: DollarSign, path: '/pricing', color: 'bg-pink-500' },
  ];

  const statTiles = stats
    ? [
        { label: 'Total Courses', value: stats.courses, icon: BookOpen, color: 'text-blue-600 bg-blue-100' },
        { label: 'Total Users', value: stats.users, icon: Users, color: 'text-indigo-600 bg-indigo-100' },
        { label: 'Organizations', value: stats.organizations, icon: Building2, color: 'text-purple-600 bg-purple-100' },
        { label: 'Enrollments', value: stats.enrollments, icon: UserCheck, color: 'text-green-600 bg-green-100' },
        { label: 'Free Trial Courses', value: stats.freeTrialCourses, icon: Gift, color: 'text-emerald-600 bg-emerald-100' },
        { label: 'Categories', value: stats.categories, icon: Tag, color: 'text-amber-600 bg-amber-100' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary-default" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Full platform management — users, roles, licenses, and resources</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-default text-primary-default'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <Card key={tile.label} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tile.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{tile.value}</p>
                        <p className="text-xs text-gray-500">{tile.label}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all text-left group"
                  >
                    <div className={`p-2.5 rounded-lg ${link.color} text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="secondary" onClick={loadUsers}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add User
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>

          {loadingUsers ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">License</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Organization</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === profile?.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 group">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {u.first_name || u.last_name
                                  ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                  : 'No name'}
                              </p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role || 'learner'}
                              onChange={(e) => handleInlineRoleChange(u.id, e.target.value)}
                              disabled={isSelf}
                              className={`text-xs border rounded px-2 py-1 font-medium disabled:opacity-50 ${getRoleBadge(u.role).color} border-transparent focus:border-blue-400`}
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.subscription_plan || 'free_trial'}
                              onChange={(e) => handleInlinePlanChange(u.id, e.target.value)}
                              className={`text-xs border rounded px-2 py-1 font-medium ${getPlanBadge(u.subscription_plan).color} border-transparent focus:border-blue-400`}
                            >
                              {PLANS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.account_type === 'corporate'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {u.account_type || 'individual'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => !isSelf && handleInlineStatusToggle(u.id, u.status)}
                              disabled={isSelf}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                                u.status === 'active'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : u.status === 'suspended'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                            >
                              {u.status === 'active' ? (
                                <><UserCheck className="w-3 h-3" /> Active</>
                              ) : (
                                <><UserX className="w-3 h-3" /> {u.status || 'inactive'}</>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 max-w-[120px] truncate">
                            {u.organization?.name || '—'}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => { setEditingUser(u); setUserModalOpen(true); }}
                                className="p-1.5 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(u)}
                                  className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          No users match the current filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── LICENSES TAB ─── */}
      {activeTab === 'licenses' && (
        <div className="space-y-6">
          {/* License overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => {
              const count = licenseStats[plan.value] || 0;
              return (
                <Card key={plan.value} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${plan.color}`}>
                      {plan.label}
                    </span>
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {count === 1 ? 'user' : 'users'} on this plan
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Bulk license assignment */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">License Management</h3>
                <p className="text-sm text-gray-500">Assign or change licenses for multiple users at once</p>
              </div>
              <Button onClick={() => setBulkLicenseOpen(true)}>
                <Key className="w-4 h-4 mr-1" /> Assign Licenses in Bulk
              </Button>
            </div>

            {/* Quick single-user license table */}
            {loadingUsers ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">User</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Current License</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Role</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Change License</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.slice(0, 25).map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <p className="font-medium text-gray-900 text-sm">
                            {u.first_name || u.last_name
                              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                              : u.email}
                          </p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadge(u.subscription_plan).color}`}>
                            {getPlanBadge(u.subscription_plan).label}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(u.role).color}`}>
                            {getRoleBadge(u.role).label}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={u.subscription_plan || 'free_trial'}
                            onChange={(e) => handleInlinePlanChange(u.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            {PLANS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length > 25 && (
                  <p className="text-xs text-gray-500 text-center py-3">
                    Showing 25 of {users.length} users. Use the Users tab for full management.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── ORGANIZATIONS TAB ─── */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={loadOrganizations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loadingOrgs ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Organization</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Domain</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Subscription</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Max Employees</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{org.name}</p>
                            <p className="text-xs text-gray-500">{org.email || org.slug}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">
                          {org.domain || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            org.subscription_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : org.subscription_status === 'trial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {org.subscription_status || 'none'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">
                          {org.max_employees ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {organizations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          No organizations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => { setUserModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        organizations={organizations}
        onSave={handleSaveUser}
        saving={saving}
      />

      <BulkLicenseModal
        isOpen={bulkLicenseOpen}
        onClose={() => setBulkLicenseOpen(false)}
        users={users}
        onApply={handleBulkLicense}
        saving={saving}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteConfirm?.email || 'this user'}? This action cannot be undone and will remove all associated data.`}
        confirmText={saving ? 'Deleting...' : 'Delete User'}
        confirmVariant="danger"
        icon={AlertTriangle}
      />
    </div>
  );
}
