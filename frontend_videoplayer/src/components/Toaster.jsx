import React from "react";

const Toast = ({ message }) => {
  return (
    <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
};

export default Toast;
