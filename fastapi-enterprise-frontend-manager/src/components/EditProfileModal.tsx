import { useState } from 'react';
import { Loader2, X, UserPen } from 'lucide-react';
import { UserService } from '../api/services';
import { notify } from "../utils/toast";

export default function EditProfileModal({ 
  user, 
  onClose,
  onSuccess
}: { 
  user: any; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialDate = user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '';

  const [formData, setFormData] = useState({
    email: user.email || '',
    full_name: user.full_name || '',
    date_of_birth: initialDate,
    phone_number: user.phone_number || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If the backend strictly requires full ISO 8601 (e.g. 2026-07-13T00:00:00.000Z)
      // instead of just YYYY-MM-DD, we format it before sending:
      const payload = {
        ...formData,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : ''
      };

      await UserService.updateProfile(payload);
      notify.success("Profile updated successfully!");
      onSuccess(); // Trigger refresh in parent
      onClose();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-md shadow-2xl border dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <UserPen className="text-blue-500" />
            Edit Profile
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar flex-grow pr-2">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-200 dark:border-red-800/50 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold dark:text-white">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                placeholder="John Doe"
                value={formData.full_name} 
                onChange={handleChange}
                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold dark:text-white">Email Address</label>
              <input 
                type="email" 
                name="email"
                placeholder="user@example.com"
                value={formData.email} 
                onChange={handleChange}
                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold dark:text-white">Phone Number</label>
              <input 
                type="tel" 
                name="phone_number"
                placeholder="+1 234 567 890"
                value={formData.phone_number} 
                onChange={handleChange}
                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold dark:text-white">Date of Birth</label>
              <input 
                type="date" 
                name="date_of_birth"
                value={formData.date_of_birth} 
                onChange={handleChange}
                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-text" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Save Changes"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}