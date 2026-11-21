/* Paginated data reads and consistent request status for journal screens. */
const journalData = (() => {
  async function readPages(page, stillCurrent, size = 500) {
    const items = [];
    for (let offset=0; ; offset=items.length) {
      const response = await page(offset,offset+size-1);
      if (!stillCurrent()) return null;
      if (response.error) throw response.error;
      if (!Array.isArray(response.data)) throw new Error('Invalid journal response');
      items.push(...response.data);
      if (response.data.length < size) return items;
    }
  }

  function status(screen, state, message = '') {
    const panel = document.getElementById(screen+'-request-status');
    panel.hidden = !state;
    panel.dataset.state = state;
    panel.querySelector('span').textContent = message;
    panel.querySelector('button').hidden = state !== 'error';
  }

  return { readPages, status };
})();
if (typeof module !== 'undefined') module.exports = journalData;
