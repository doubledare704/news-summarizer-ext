/**
 * Background script for News Summarizer.
 * Handles side panel configuration and opening.
 */

chrome.runtime.onInstalled.addListener(() => {
  // Set the side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting panel behavior:', error));
});

// Listen for messages if needed in the future
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Add background specific logic here if necessary
  return true;
});