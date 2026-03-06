/**
 * api-config.js — Centralized API configuration.
 * All frontend scripts reference window.APP_API_BASE for the backend URL.
 * To change the backend URL (e.g. for production), update this file only.
 *
 * Usage: const API = window.APP_API_BASE;
 */
(function () {
    // Change this to your production URL when deploying
    window.APP_API_BASE = "http://localhost:5000/api";
})();
