(() => {
  const STORAGE_KEY = 'uangku-transactions-v1';
  const expenseCategories = ['Makan', 'Transportasi', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya'];
  const incomeCategories = ['Gaji', 'Bonus', 'Hadiah', 'Usaha', 'Lainnya'];
  const $ = (selector) => document.querySelector(selector);
  const form = $('#transaction-form');
  const dateInput = $('#date');
  const amountInput = $('#amount');
  const categoryInput = $('#category');
  const noteInput = $('#note');
  const monthPicker = $('#month-picker');
  const chipContainer = $('#category-chips');
  const message = $('#form-message');
  let currentType = 'expense';
  let hidden = false;

  const today = new Date();
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthKey = (date) => date.slice(0, 7);
  const rupiah = (value) => hidden ? '••••••' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  const formatDate = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

  function readTransactions() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((item) => item && Number.isFinite(Number(item.amount)) && item.date && item.type) : [];
    } catch {
      return [];
    }
  }
  function writeTransactions(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      message.textContent = 'Penyimpanan browser penuh atau tidak tersedia.';
      return false;
    }
  }
  function selectedTransactions() {
    const month = monthPicker.value;
    return readTransactions().filter((item) => monthKey(item.date) === month).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }
  function renderChips() {
    const options = currentType === 'expense' ? expenseCategories : incomeCategories;
    chipContainer.replaceChildren(...options.map((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = name;
      button.addEventListener('click', () => {
        categoryInput.value = name;
        chipContainer.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('chosen', chip === button));
      });
      return button;
    }));
  }
  function render() {
    const items = selectedTransactions();
    const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
    const balance = income - expense;
    const [year, month] = monthPicker.value.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    $('#balance').textContent = rupiah(balance);
    $('#income').textContent = rupiah(income);
    $('#expense').textContent = rupiah(expense);
    $('#daily-average').textContent = rupiah(Math.round(expense / days));
    $('#saved-percent').textContent = income ? `${Math.round((balance / income) * 100)}%` : '0%';

    const insight = $('#insight-text');
    if (!items.length) {
      insight.textContent = 'Catat beberapa transaksi untuk melihat insight.';
    } else if (expense === 0 && income > 0) {
      insight.textContent = `Keren, belum ada pengeluaran yang tercatat dari pemasukan ${rupiah(income)}.`;
    } else {
      const biggest = items.filter((item) => item.type === 'expense').reduce((best, item) => !best || Number(item.amount) > Number(best.amount) ? item : best, null);
      insight.textContent = biggest ? `Pengeluaran terbesar bulan ini: ${biggest.category} sebesar ${rupiah(Number(biggest.amount))}.` : `Total pemasukan bulan ini ${rupiah(income)}.`;
    }

    const list = $('#transaction-list');
    list.replaceChildren(...items.map((item) => {
      const row = document.createElement('li');
      row.className = 'transaction-row';
      const info = document.createElement('div');
      info.className = 'transaction-info';
      const title = document.createElement('strong');
      title.textContent = item.category;
      const detail = document.createElement('span');
      detail.textContent = `${formatDate(item.date)}${item.note ? ` · ${item.note}` : ''}`;
      info.append(title, detail);
      const right = document.createElement('div');
      right.className = 'transaction-right';
      const amount = document.createElement('span');
      amount.className = `transaction-amount ${item.type === 'income' ? 'positive' : 'negative'}`;
      amount.textContent = `${item.type === 'income' ? '+' : '−'}${rupiah(Number(item.amount))}`;
      const remove = document.createElement('button');
      remove.className = 'delete-button';
      remove.type = 'button';
      remove.textContent = 'Hapus';
      remove.setAttribute('aria-label', `Hapus transaksi ${item.category}`);
      remove.addEventListener('click', () => {
        writeTransactions(readTransactions().filter((entry) => entry.id !== item.id));
        render();
      });
      right.append(amount, remove);
      row.append(info, right);
      return row;
    }));
    $('#empty-state').hidden = items.length > 0;
    $('#transaction-count').textContent = `${items.length} transaksi`;
    $('#toggle-visibility').textContent = hidden ? 'Tampilkan' : 'Sembunyikan';
    $('#toggle-visibility').setAttribute('aria-pressed', String(hidden));
  }

  document.querySelectorAll('.segment').forEach((button) => button.addEventListener('click', () => {
    currentType = button.dataset.type;
    document.querySelectorAll('.segment').forEach((segment) => {
      const active = segment === button;
      segment.classList.toggle('selected', active);
      segment.setAttribute('aria-pressed', String(active));
    });
    categoryInput.value = '';
    renderChips();
  }));
  $('#toggle-visibility').addEventListener('click', () => { hidden = !hidden; render(); });
  monthPicker.addEventListener('change', render);
  categoryInput.addEventListener('input', () => chipContainer.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('chosen', chip.textContent.toLowerCase() === categoryInput.value.trim().toLowerCase())));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number(amountInput.value);
    const category = categoryInput.value.trim();
    if (!Number.isSafeInteger(amount) || amount <= 0 || !category || !dateInput.value) {
      message.textContent = 'Isi tanggal, kategori, dan jumlah rupiah yang valid.';
      return;
    }
    const items = readTransactions();
    items.push({ id: Date.now(), type: currentType, date: dateInput.value, amount, category, note: noteInput.value.trim() });
    if (!writeTransactions(items)) return;
    if (monthKey(dateInput.value) !== monthPicker.value) monthPicker.value = monthKey(dateInput.value);
    amountInput.value = '';
    noteInput.value = '';
    message.textContent = 'Transaksi berhasil disimpan.';
    render();
  });

  dateInput.value = localDate(today);
  monthPicker.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  renderChips();
  render();
})();
