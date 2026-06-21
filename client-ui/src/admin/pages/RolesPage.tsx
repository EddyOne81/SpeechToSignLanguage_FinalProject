import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";

interface RoleItem {
  roleId: number;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

interface PermissionItem {
  permissionId: number;
  code: string;
  name: string;
}

function PermissionGrid({
  permissions,
  selected,
  onToggle,
}: {
  permissions: PermissionItem[];
  selected: Set<string>;
  onToggle: (code: string) => void;
}) {
  if (permissions.length === 0)
    return (
      <p className="text-xs text-neutral-500">No permissions available.</p>
    );
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {permissions.map((p) => {
        const checked = selected.has(p.code);
        return (
          <label
            key={p.permissionId}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
              checked
                ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
            }`}>
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                checked
                  ? "border-indigo-400 bg-indigo-500"
                  : "border-neutral-600"
              }`}>
              {checked && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(p.code)}
              className="sr-only"
            />
            <span className="truncate text-xs">{p.name}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function RolesPage() {
  const [tab, setTab] = useState<"roles" | "permissions">("roles");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPermName, setNewPermName] = useState("");
  const [saving, setSaving] = useState(false);

  // Create role state
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [createPerms, setCreatePerms] = useState<Set<string>>(new Set());
  const [createIsSystem, setCreateIsSystem] = useState(false);

  // Edit role state
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [editIsSystem, setEditIsSystem] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadRoles = useCallback(async () => {
    const res = await adminFetch("/api/roles?page=0&size=100");
    const pg = unwrapPage(res);
    setRoles(pg.content);
  }, []);

  const loadPermissions = useCallback(async () => {
    const res = await adminFetch("/api/permissions?page=0&size=100");
    const pg = unwrapPage(res);
    setPermissions(pg.content);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadRoles(), loadPermissions()]);
      } catch (err: any) {
        setError(err.message ?? "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadRoles, loadPermissions]);

  const toggleCreatePerm = (code: string) =>
    setCreatePerms((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const toggleEditPerm = (code: string) =>
    setEditPerms((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const createRole = async () => {
    if (!newRoleCode.trim() || createPerms.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const code = newRoleCode.trim().toUpperCase();
      await adminFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify({
          code,
          name: code,
          isSystem: createIsSystem,
          permissionCodes: Array.from(createPerms),
        }),
      });
      setNewRoleCode("");
      setCreatePerms(new Set());
      setCreateIsSystem(false);
      setShowCreate(false);
      await loadRoles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (role: RoleItem) => {
    setEditingRole(role);
    setEditPerms(new Set(role.permissions ?? []));
    setEditIsSystem(role.isSystem ?? false);
    setShowCreate(false);
  };

  const saveEdit = async () => {
    if (!editingRole || editPerms.size === 0) return;
    setEditing(true);
    setError(null);
    try {
      await adminFetch(`/api/roles/${editingRole.roleId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingRole.name,
          isSystem: editIsSystem,
          permissionCodes: Array.from(editPerms),
        }),
      });
      setEditingRole(null);
      await loadRoles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditing(false);
    }
  };

  const deleteRole = async (roleId: number) => {
    if (!window.confirm("Delete this role?")) return;
    setError(null);
    try {
      await adminFetch(`/api/roles/${roleId}`, { method: "DELETE" });
      if (editingRole?.roleId === roleId) setEditingRole(null);
      await loadRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createPermission = async () => {
    if (!newPermName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const code = newPermName.trim().toUpperCase();
      await adminFetch("/api/permissions", {
        method: "POST",
        body: JSON.stringify({ code, name: code }),
      });
      setNewPermName("");
      await loadPermissions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePermission = async (permissionId: number) => {
    if (!window.confirm("Delete this permission?")) return;
    setError(null);
    try {
      await adminFetch(`/api/permissions/${permissionId}`, {
        method: "DELETE",
      });
      await loadPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">
          Roles & Permissions
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage system access control
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex gap-0 border-b border-neutral-800">
        {(["roles", "permissions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}>
            {t === "roles" ? "Roles" : "Permissions"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-neutral-500">Loading...</div>
      ) : tab === "roles" ? (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowCreate((v) => !v);
                setEditingRole(null);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors">
              {showCreate ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {showCreate ? "Cancel" : "New Role"}
            </button>
          </div>

          {/* Create panel */}
          {showCreate && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-300">
                  New Role
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-400">
                  Role Name
                </label>
                <input
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createRole()}
                  placeholder="e.g. ROLE_MODERATOR"
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">
                    Permissions
                    <span className="ml-1.5 text-rose-400">*</span>
                    <span className="ml-2 text-neutral-600">
                      ({createPerms.size} selected)
                    </span>
                  </label>
                </div>
                <PermissionGrid
                  permissions={permissions}
                  selected={createPerms}
                  onToggle={toggleCreatePerm}
                />
                {createPerms.size === 0 && (
                  <p className="text-xs text-rose-400">
                    At least 1 permission is required.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-700/50 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-400">
                  <div
                    onClick={() => setCreateIsSystem((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      createIsSystem ? "bg-indigo-600" : "bg-neutral-700"
                    }`}>
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        createIsSystem ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  System role (cannot be deleted)
                </label>
                <button
                  onClick={() => void createRole()}
                  disabled={
                    saving || !newRoleCode.trim() || createPerms.size === 0
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {saving ? "Creating…" : "Create Role"}
                </button>
              </div>
            </div>
          )}

          {/* Edit panel */}
          {editingRole && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    Edit{" "}
                    <span className="font-mono text-amber-200">
                      {editingRole.name}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setEditingRole(null)}
                  className="rounded p-1 text-neutral-500 hover:text-neutral-200 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">
                    Permissions
                    <span className="ml-1.5 text-rose-400">*</span>
                    <span className="ml-2 text-neutral-600">
                      ({editPerms.size} selected)
                    </span>
                  </label>
                </div>
                <PermissionGrid
                  permissions={permissions}
                  selected={editPerms}
                  onToggle={toggleEditPerm}
                />
                {editPerms.size === 0 && (
                  <p className="text-xs text-rose-400">
                    At least 1 permission is required.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-700/50 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-400">
                  <div
                    onClick={() => setEditIsSystem((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      editIsSystem ? "bg-indigo-600" : "bg-neutral-700"
                    }`}>
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        editIsSystem ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  System role (cannot be deleted)
                </label>
                <button
                  onClick={() => void saveEdit()}
                  disabled={editing || editPerms.size === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50 transition-colors">
                  {editing ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* Roles table */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-neutral-500">
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr
                      key={r.roleId}
                      className={`border-b border-neutral-800/60 hover:bg-neutral-800/30 ${
                        editingRole?.roleId === r.roleId
                          ? "bg-amber-950/20"
                          : ""
                      }`}>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                        {r.roleId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                          {r.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500">
                          {r.permissions?.length ?? 0} permission
                          {(r.permissions?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.isSystem ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            System
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-700/50 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200 transition-colors"
                            title="Edit permissions">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!r.isSystem && (
                            <button
                              onClick={() => void deleteRole(r.roleId)}
                              className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors"
                              title="Delete role">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newPermName}
              onChange={(e) => setNewPermName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createPermission()}
              placeholder="e.g. DICTIONARY_WRITE"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => void createPermission()}
              disabled={saving || !newPermName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              <Plus className="h-4 w-4" />
              Add Permission
            </button>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-neutral-500">
                      No permissions found.
                    </td>
                  </tr>
                ) : (
                  permissions.map((p) => (
                    <tr
                      key={p.permissionId}
                      className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                        {p.permissionId}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 text-sm">
                        {p.name}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void deletePermission(p.permissionId)}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
