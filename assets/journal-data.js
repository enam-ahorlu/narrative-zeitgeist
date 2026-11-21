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

  function readEntries(client, owner, stillCurrent) {
    return readPages((from,to) => client.from('entries_with_tags').select('*').eq('user_id',owner)
      .order('created_at',{ascending:false}).order('id').range(from,to), stillCurrent);
  }

  function status(screen, state, message = '') {
    const panel = document.getElementById(screen+'-request-status');
    panel.hidden = !state;
    panel.dataset.state = state;
    panel.querySelector('span').textContent = message;
    panel.querySelector('button').hidden = state !== 'error';
  }

  async function run(screen, operation, stillCurrent, messages) {
    status(screen,'loading',messages.loading);
    try {
      const result = await operation();
      if (!stillCurrent()) return null;
      status(screen,'');
      return result;
    } catch (error) {
      if (stillCurrent()) {
        status(screen,'error',typeof messages.error === 'function' ? messages.error(error) : messages.error);
      }
      return null;
    }
  }

  return { readPages, readEntries, status, run };
})();
if (typeof module !== 'undefined') module.exports = journalData;
