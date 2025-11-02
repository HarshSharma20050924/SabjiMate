import React, { useEffect } from 'react';

export interface NotificationPayload {
  title: string;
  body: string;
}

interface NotificationToastProps {
  notification: NotificationPayload | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000); // Auto-dismiss after 8 seconds

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 max-w-md mx-auto p-2 z-[100] animate-slide-in-down">
        <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-200">
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                <div className="p-2 bg-green-500 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">
                    {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                    {notification.body}
                </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                <button onClick={onClose} className="inline-flex text-gray-400 hover:text-gray-500">
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                </div>
            </div>
        </div>
    </div>
  );
};

// Add keyframes for the slide-in animation to index.html if not already present
const slideInDownAnimation = `
  @keyframes slide-in-down {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-in-down { animation: slide-in-down 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
`;

// Inject style into the document head
const styleSheet = document.createElement("style");
styleSheet.innerText = slideInDownAnimation;
document.head.appendChild(styleSheet);


export default NotificationToast;