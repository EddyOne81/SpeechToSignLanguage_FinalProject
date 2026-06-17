import { useCallback, useEffect, useState } from "react";
import { Trash2, UserCog } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";

interface User {
  userId: number;
  username: string;
  email?: string;
  roles?: (string | { name?: string; roleName?: string })[];
  createdAt?: string;
}

function getRoleNames(roles: User["roles"]): string[] {
  if (!roles) return [];
  return roles
    .map((r) => (typeof r === "string" ? r : (r.name ?? r.roleName ?? "")))
    .filter(Boolean);
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleEditing, setRoleEditing] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  const load = useCallback(
    async (p = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(`/api/users?page=${p}&size=15&sort=userId,desc`);
        const pg = unwrapPage(res);
        setUsers(pg.content);
        setTotalPages(pg.totalPages);
        setTotalElements(pg.totalElements);
        setPage(p);
      } catch (err: any) {
        setError(err.message ?? "Failed to load users.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => { void load(0); }, [load]);

  const handleRoleChange = async (user: User, newRole: string) => {
    setSaving((prev) => ({ ...prev, [user.userId]: true }));
    try {
      await adminFetch(`/api/users/${user.userId}`, {
        method: "PUT",
        body: JSON.stringify({ roleNames: [newRole] }),
      });
      await load(page);
    } catch (err: any) {
      setError(err.message ?? "Failed to update role.");
    } finally {
      setSaving((prev) => ({ ...prev, [user.userId]: false }));
      setRoleEditing((prev) => {
        const n = { ...prev };
        delete n[user.userId];
        return n;
      });
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm("Delete this user permanently? This cannot be undone.")) return;
    setDeleting((prev) => ({ ...prev, [userId]: true }));
    try {
      await adminFetch(`/api/users/${userId}`, { method: "DELETE" });
      await load(page);
    } catch (err: any) {
      setError(err.message ?? "Failed to delete user.");
    } finally {
      setDeleting((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">User Management</h1>
        <p className="mt-1 text-sm text-neutral-500">{totalElements} users total</p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Username</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Role</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Created</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const roles = getRoleNames(u.roles);
                  const isAdmin = roles.includes("ROLE_ADMIN");
                  const isEditing = roleEditing[u.userId] !== undefined;
                  return (
                    <tr key={u.userId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{u.userId}</td>
                      <td className="px-4 py-3 font-medium text-neutral-200">{u.username}</td>
                      <td className="px-4 py-3 text-neutral-400">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={roleEditing[u.userId]}
                              onChange={(e) =>
                                setRoleEditing((prev) => ({ ...prev, [u.userId]: e.target.value }))
                              }
                              className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 focus:outline-none"
                            >
                              <option value="ROLE_USER">ROLE_USER</option>
                              <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                            </select>
                            <button
                              onClick={() => void handleRoleChange(u, roleEditing[u.userId])}
                              disabled={saving[u.userId]}
                              className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                              {saving[u.userId] ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() =>
                                setRoleEditing((prev) => {
                                  const n = { ...prev };
                                  delete n[u.userId];
                                  return n;
                                })
                              }
                              className="rounded px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isAdmin
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "bg-neutral-700/60 text-neutral-300"
                            }`}
                          >
                            {roles.join(", ") || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setRoleEditing((prev) => ({
                                ...prev,
                                [u.userId]: isAdmin ? "ROLE_USER" : "ROLE_ADMIN",
                              }))
                            }
                            title="Change role"
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(u.userId)}
                            disabled={deleting[u.userId]}
                            title="Delete user"
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-1">
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPage={load} />
        </div>
      </div>
    </div>
  );
}
