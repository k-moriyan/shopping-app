import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { database } from './firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [products, setProducts] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const [form, setForm] = useState({
    商品名: '',
    金額: '',
    店舗名: 'コスモス',
    記録日: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const dataRef = ref(database, '/products');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        productsArray.sort((a, b) => new Date(b['記録日']) - new Date(a['記録日']));
        setProducts(productsArray);
      }
    });

    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === '金額') {
      const numericValue = value.replace(/[^\d]/g, '');
      const formatted = numericValue ? Number(numericValue).toLocaleString() : '';
      setForm({ ...form, [name]: formatted });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      金額: Number(form.金額.replace(/,/g, '')),
    };
    push(ref(database, '/products'), payload);
    setForm({
      商品名: '',
      金額: '',
      店舗名: 'コスモス',
      記録日: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('削除しますか？')) {
      remove(ref(database, `/products/${id}`));
    }
  };

  const handleEdit = (item) => {
    setEditTarget({
      ...item,
      金額: item['金額'].toLocaleString(),
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === '金額') {
      const numericValue = value.replace(/[^\d]/g, '');
      const formatted = numericValue ? Number(numericValue).toLocaleString() : '';
      setEditTarget({ ...editTarget, [name]: formatted });
    } else {
      setEditTarget({ ...editTarget, [name]: value });
    }
  };

  const handleEditSubmit = () => {
    if (window.confirm('更新しますか？')) {
      const dataRef = ref(database, `/products/${editTarget.id}`);
      update(dataRef, {
        商品名: editTarget['商品名'],
        金額: Number(editTarget['金額'].replace(/,/g, '')),
        店舗名: editTarget['店舗名'],
        記録日: editTarget['記録日'],
      });
      setEditModalOpen(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const formatPrice = (price) => Number(price).toLocaleString();

  const lowestPrices = products.reduce((acc, item) => {
    const productName = item['商品名'];
    const price = item['金額'];
    const store = item['店舗名'];
    if (!acc[productName] || price < acc[productName].price) {
      acc[productName] = { price, store };
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen font-rounded">
      <header className="bg-lightblue-200 text-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shopping Journal</h1>
        <button
          onClick={toggleDarkMode}
          className="rounded-md bg-white text-lightblue-600 px-3 py-1 hover:bg-lightblue-100 transition"
        >
          {darkMode ? 'ライト' : 'ダーク'}
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
      <section className="mb-8">
  <h2 className="text-xl font-semibold mb-4">最安値一覧</h2>
  <div className="flex flex-wrap gap-4">
    {Object.entries(lowestPrices).map(([name, { price, store }]) => (
      <div key={name} className="w-1/2 bg-white rounded-md shadow-sm p-4">
        <h3 className="text-lg font-medium">{name}</h3>
        <p className="text-sm text-gray-500">💰 {formatPrice(price)}円</p>
        <p className="text-sm text-gray-500">🏪 {store}</p>
      </div>
    ))}
  </div>
</section>
        <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-sm p-6 mb-8 space-y-4">
          <input
            type="text"
            name="商品名"
            placeholder="商品名"
            value={form.商品名}
            onChange={handleChange}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
          />
          <input
            type="text"
            name="金額"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="金額"
            value={form.金額}
            onChange={handleChange}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
          />
          <select
            name="店舗名"
            value={form.店舗名}
            onChange={handleChange}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
          >
            <option value="コスモス">コスモス</option>
            <option value="明治屋">明治屋</option>
            <option value="ルミエール">ルミエール</option>
          </select>
          <input
            type="date"
            name="記録日"
            value={form.記録日}
            onChange={handleChange}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
          />
          <button
            type="submit"
            className="w-full bg-lightblue-300 text-gray-800 p-3 rounded-md hover:bg-lightblue-400 transition"
          >
            ➕ 追加
          </button>
        </form>

        <section className="space-y-4">
          {products.map((item) => (
            <div key={item.id} className="bg-white rounded-md shadow-sm p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-800">{item['商品名']}</h3>
                <p className="text-sm text-gray-500">💰 {formatPrice(item['金額'])}円</p>
                <p className="text-sm text-gray-500">📅 {formatDisplayDate(item['記録日'])}</p>
                <p className="text-sm text-gray-500">🏪 {item['店舗名']}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(item)} className="px-3 py-1 bg-lightblue-300 text-gray-800 rounded-md hover:bg-lightblue-400 transition">編集</button>
                <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-400 text-white rounded-md hover:bg-red-500 transition">削除</button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;