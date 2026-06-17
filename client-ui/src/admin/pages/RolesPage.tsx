import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { adminFetch, unwrapData, unwrapPage } from "../utils";

interface RoleItem {
  roleId: number;
  name: string;
}

interface PermissionItem {
  permissionId: number;
  name: string;
}

export default function RolesPage() {
  const [tab, setTab] = useState<"roles" | "permissions">("roles");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermName, setNewPermName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    const res = await adminFetch("/api/roles?page=0&size=100");
    const pg = unwrapPage(res);
    setRoles(pg.content.length > 0 ? pg.content : (Array.isArray(unwrapData(res)) ? unwrapData(res) : []));
  }, []);

  const loadPermissions = useCallback(async () => {
    const res = await adminFetch("/api/permissions?page=0&size=100");
    const pg = unwrapPage(res);
    setPermissions(pg.content.length > 0 ? pg.content : (Array.isArray(unwrapData(res)) ? unwrapData(res) : []));
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

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: newRoleName.trim().toUpperCase() }),
      });
      setNewRoleName("");
      await loadRoles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: number) => {
    if (!window.confirm("Delete this role?")) return;
    setError(null);
    try {
      await adminFetch(`/api/roles/${roleId}`, { method: "DELETE" });
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
      await adminFetch("/api/permissions", {
        method: "POST",
        body: JSON.stringify({ name: newPermName.trim().toUpperCase() }),
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
      await adminFetch(`/api/permissions/${permissionId}`, { method: "DELETE" });
      await loadPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage system access control</p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
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
            }`}
          >
            {t === "roles" ? "Roles" : "Permissions"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-neutral-500">Loading...</div>
      ) : tab === "roles" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createRole()}
              placeholder="e.g. ROLE_MODERATOR"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => void createRole()}
              disabled={saving || !newRoleName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Role
            </button>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">No roles found.</td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.roleId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{r.roleId}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                          {r.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void deleteRole(r.roleId)}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors"
                        >
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Permission
            </button>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">No permissions found.</td>
                  </tr>
                ) : (
                  permissions.map((p) => (
                    <tr key={p.permissionId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{p.permissionId}</td>
                      <td className="px-4 py-3 text-neutral-300 font-mono text-xs">{p.name}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void deletePermission(p.permissionId)}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors"
                        >
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
