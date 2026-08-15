import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"

const emptyForm = { full_name: "", phone: "", address: "", username: "", password: "" }

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // ─── FETCH ───────────────────────────────────────────────
  const fetchEmployees = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching employees:", error)
      showToast("Failed to load employees: " + error.message, "error")
    } else {
      setEmployees(data ?? [])
    }
    setLoading(false)
  }

  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchEmployees()
  }, [])

  // ─── TOAST ───────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── FILTER ──────────────────────────────────────────────
  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.username?.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.toString().includes(search)
  )

  // ─── VALIDATE ────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = "Full name is required"
    if (!form.username.trim()) e.username = "Username is required"
    if (!editId && !form.password.trim()) e.password = "Password is required"
    if (!form.phone.toString().trim()) e.phone = "Phone is required"
    if (!form.address.trim()) e.address = "Address is required"
    return e
  }

  // ─── OPEN ADD ────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setErrors({})
    setShowPassword(false)
    setShowModal(true)
  }

  // ─── OPEN EDIT ───────────────────────────────────────────
  const openEdit = (emp) => {
    setForm({
      full_name: emp.full_name ?? "",
      phone: emp.phone ?? "",
      address: emp.address ?? "",
      username: emp.username ?? "",
      password: "",  // don't prefill password for security
    })
    setEditId(emp.id)
    setErrors({})
    setShowPassword(false)
    setShowModal(true)
  }

  // ─── SAVE ────────────────────────────────────────────────
  // ─── SAVE ────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setSaving(true)

    // ── Duplicate username check ──────────────────────────
    let query = supabase
      .from("employees")
      .select("id")
      .eq("username", form.username.trim())

    if (editId) query = query.neq("id", editId) // exclude self when editing

    const { data: existing, error: checkError } = await query.maybeSingle()

    if (checkError) {
      showToast("Failed to check username: " + checkError.message, "error")
      setSaving(false)
      return
    }

    if (existing) {
      setErrors({ username: "Username already exists. Please choose another." })
      setSaving(false)
      return
    }
    // ─────────────────────────────────────────────────────

    const payload = {
      full_name: form.full_name,
      phone: Number(form.phone),
      address: form.address,
      username: form.username,
      ...(form.password.trim() ? { password: form.password } : {})
    }

    if (editId) {
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editId)

      if (error) {
        showToast("Failed to update: " + error.message, "error")
      } else {
        showToast("Employee updated successfully.")
        setShowModal(false)
        fetchEmployees()
      }
    } else {
      const { error } = await supabase
        .from("employees")
        .insert([payload])

      if (error) {
        showToast("Failed to add: " + error.message, "error")
      } else {
        showToast("Employee added successfully.")
        setShowModal(false)
        fetchEmployees()
      }
    }

    setSaving(false)
  }

  // ─── DELETE ──────────────────────────────────────────────
  const confirmDelete = (id) => setDeleteId(id)
  const handleDelete = async () => {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", deleteId)

    if (error) {
      showToast("Failed to delete: " + error.message, "error")
    } else {
      showToast("Employee deleted.")
      setEmployees(prev => prev.filter(e => e.id !== deleteId))
    }
    setDeleteId(null)
  }

  return (
    <DashboardLayout>
      <style>{`
        .emp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .emp-header h2 { margin: 0; font-size: 22px; color: #111827; }
        .header-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .search-input {
          padding: 9px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: none;
          font-size: 13px;
          width: 220px;
          background: white;
        }
        .search-input:focus {
          border-color: #b30000;
          box-shadow: 0 0 0 2px rgba(179,0,0,0.15);
        }
        .btn-add {
          padding: 9px 16px;
          background: #b30000;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-add:hover { background: #e00000; }
        .table-wrap {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .emp-table { width: 100%; border-collapse: collapse; }
        .emp-table th {
          background: #f9fafb;
          padding: 12px 15px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }
        .emp-table td {
          padding: 13px 15px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
        }
        .emp-table tr:last-child td { border-bottom: none; }
        .emp-table tbody tr:hover { background: #fafafa; }
        .action-btns { display: flex; gap: 8px; }
        .btn-edit {
          padding: 6px 12px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .btn-edit:hover { background: #2563eb; }
        .btn-delete {
          padding: 6px 12px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .btn-delete:hover { background: #dc2626; }
        .empty-row td {
          text-align: center;
          color: #9ca3af;
          padding: 40px;
          font-size: 14px;
        }
        .skeleton-row td { padding: 13px 15px; border-bottom: 1px solid #f3f4f6; }
        .skeleton {
          height: 14px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 14px;
          padding: 30px;
          width: 460px;
          max-width: 95vw;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal h3 { margin: 0 0 20px; font-size: 18px; color: #111827; }
        .form-group { margin-bottom: 14px; }
        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          background: #f9fafb;
        }
        .form-group input:focus {
          border-color: #b30000;
          box-shadow: 0 0 0 2px rgba(179,0,0,0.15);
          background: white;
        }
        .input-error { border-color: #ef4444 !important; }
        .error-msg { font-size: 11px; color: #ef4444; margin-top: 4px; }
        .pw-wrapper { position: relative; }
        .pw-wrapper input { padding-right: 40px; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          font-size: 16px;
          user-select: none;
        }
        .edit-note {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }
        .btn-cancel {
          padding: 9px 18px;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-cancel:hover { background: #e5e7eb; }
        .btn-save {
          padding: 9px 20px;
          background: #b30000;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-save:not(:disabled):hover { background: #e00000; }
        .confirm-modal {
          background: white;
          border-radius: 14px;
          padding: 30px;
          width: 360px;
          max-width: 95vw;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          text-align: center;
        }
        .confirm-modal .icon { font-size: 40px; margin-bottom: 12px; }
        .confirm-modal h3 { margin: 0 0 8px; color: #111827; font-size: 18px; }
        .confirm-modal p { color: #6b7280; font-size: 14px; margin: 0 0 22px; }
        .confirm-footer { display: flex; justify-content: center; gap: 10px; }
        .btn-confirm-delete {
          padding: 9px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-confirm-delete:hover { background: #dc2626; }
        .count-label { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          z-index: 9999;
          animation: slideUp 0.3s ease;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          max-width: 320px;
        }
        .toast-success { background: #16a34a; }
        .toast-error { background: #dc2626; }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* HEADER */}
      <div className="emp-header">
        <h2>Employees</h2>
        <div className="header-right">
          <input
            className="search-input"
            type="text"
            placeholder="🔍 Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-add" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <div className="count-label">
        Showing {filtered.length} of {employees.length} employee{employees.length !== 1 ? "s" : ""}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr className="skeleton-row" key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ width: j === 0 ? 20 : "80%" }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6}>No employees found.</td>
              </tr>
            ) : (
              filtered.map((emp, i) => (
                <tr key={emp.id}>
                  <td>{i + 1}</td>
                  <td><strong>{emp.full_name}</strong></td>
                  <td>{emp.username}</td>
                  <td>{emp.phone}</td>
                  <td>{emp.address}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => openEdit(emp)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => confirmDelete(emp.id)}>🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editId ? "✏️ Edit Employee" : "➕ Add Employee"}</h3>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Juan dela Cruz"
                value={form.full_name}
                className={errors.full_name ? "input-error" : ""}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
              {errors.full_name && <div className="error-msg">{errors.full_name}</div>}
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                placeholder="e.g. 09171234567"
                value={form.phone}
                className={errors.phone ? "input-error" : ""}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              {errors.phone && <div className="error-msg">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                placeholder="e.g. Manila, PH"
                value={form.address}
                className={errors.address ? "input-error" : ""}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
              {errors.address && <div className="error-msg">{errors.address}</div>}
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="e.g. jdelacruz"
                value={form.username}
                className={errors.username ? "input-error" : ""}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
              {errors.username && <div className="error-msg">{errors.username}</div>}
            </div>

            <div className="form-group">
              <label>Password {editId && <span style={{ color: "#9ca3af", fontWeight: 400 }}>(leave blank to keep current)</span>}</label>
              <div className="pw-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={editId ? "Enter new password to change" : "Enter password"}
                  value={form.password}
                  className={errors.password ? "input-error" : ""}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <span className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>
              {errors.password && <div className="error-msg">{errors.password}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="icon">🗑️</div>
            <h3>Delete Employee?</h3>
            <p>This action cannot be undone. Are you sure you want to delete this employee?</p>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-confirm-delete" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

    </DashboardLayout>
  )
}
