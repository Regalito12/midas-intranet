type ToastType = 'success' | 'error' | 'warning' | 'info';

export function showToast(message: string, type: ToastType = 'info') {
  const existingContainer = document.getElementById('toast-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 right-4 z-[9999] space-y-2';

  const toast = document.createElement('div');
  toast.className = `
    flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white
    transform transition-all duration-300 min-w-[300px] max-w-md
    ${type === 'success' ? 'bg-primary' : ''}
    ${type === 'error' ? 'bg-[#EF4444]' : ''}
    ${type === 'warning' ? 'bg-[#F59E0B]' : ''}
    ${type === 'info' ? 'bg-[#0066CC]' : ''}
  `;

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
  };

  toast.innerHTML = `
    <i class="fas ${iconMap[type]} text-xl"></i>
    <span class="flex-1 font-medium">${message}</span>
    <button onclick="this.parentElement.remove()" class="hover:opacity-80 transition">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);
  document.body.appendChild(container);

  toast.style.transform = 'translateX(400px)';
  toast.style.opacity = '0';

  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3000);
}
