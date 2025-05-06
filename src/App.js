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

  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    if (!form.商品名.trim()) newErrors.商品名 = '商品名を入力してください';
    if (!form.金額 || Number(form.金額.replace(/,/g, '')) <= 0) newErrors.金額 = '金額は1以上で入力してください';
    if (!form.記録日) newErrors.記録日 = '記録日を選択してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

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
    setErrors({});
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
    <div className="min-h-screen p-4 bg-pink-50 text-gray-800 dark:bg-gray-900 dark:text-pink-100 transition-colors duration-300">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛍️ 商品入力フォーム</h1>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-pink-200 dark:bg-pink-700 shadow hover:bg-pink-300 dark:hover:bg-pink-600"
        >
          {darkMode ? '☀️' : '🌙'}
        </motion.button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <div>
          <input
            type="text"
            name="商品名"
            placeholder="商品名"
            value={form.商品名}
            onChange={handleChange}
            className="w-full p-3 rounded-2xl border border-pink-300 dark:border-pink-700 bg-white dark:bg-pink-800"
          />
          {errors.商品名 && <p className="text-red-500 text-sm mt-1">{errors.商品名}</p>}
        </div>
        <div>
          <input
            type="text"
            name="金額"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="金額"
            value={form.金額}
            onChange={handleChange}
            className="w-full p-3 rounded-2xl border border-pink-300 dark:border-pink-700 bg-white dark:bg-pink-800"
          />
          {errors.金額 && <p className="text-red-500 text-sm mt-1">{errors.金額}</p>}
        </div>
        <select
          name="店舗名"
          value={form.店舗名}
          onChange={handleChange}
          className="w-full p-3 rounded-2xl border border-pink-300 dark:border-pink-700 bg-white dark:bg-pink-800"
        >
          <option value="コスモス">コスモス</option>
          <option value="明治屋">明治屋</option>
          <option value="ルミエール">ルミエール</option>
        </select>
        <div>
          <input
            type="date"
            name="記録日"
            value={form.記録日}
            onChange={handleChange}
            className="w-full p-3 rounded-2xl border border-pink-300 dark:border-pink-700 bg-white dark:bg-pink-800"
          />
          {errors.記録日 && <p className="text-red-500 text-sm mt-1">{errors.記録日}</p>}
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full p-3 bg-pink-400 text-white rounded-2xl shadow-md hover:bg-pink-500"
        >
          ➕ 追加
        </motion.button>
      </form>

      <h2 className="text-2xl font-semibold mt-8 mb-4">🏆 商品ごとの最安値</h2>
      <div className="flex flex-wrap gap-4 mb-6 max-w-4xl mx-auto">
        {Object.entries(lowestPrices).map(([name, { price, store }]) => (
          <div key={name} className="flex flex-col items-center p-3 bg-yellow-100 dark:bg-yellow-800 rounded-xl shadow w-40">
            <strong className="text-lg">{name}</strong>
            <p className="text-sm">💰 {formatPrice(price)}円</p>
            <p className="text-sm">🏪 {store}</p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">📋 商品リスト</h2>
      <div className="grid gap-4">
        {products.map((item) => (
          <div key={item.id} className="p-4 bg-pink-100 dark:bg-pink-800 rounded-2xl shadow-md flex justify-between items-center">
            <div>
              <strong className="text-lg font-semibold">{item['商品名']}</strong>
              <p>💰 {formatPrice(item['金額'])}円</p>
              <p>🏪 {item['店舗名']}</p>
              <p>📅 {formatDisplayDate(item['記録日'])}</p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button onClick={() => handleEdit(item)} className="text-blue-500 hover:scale-110">✏️</button>
              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:scale-110">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* 編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">✏️ 編集</h3>
            <input
              type="text"
              name="商品名"
              value={editTarget['商品名']}
              onChange={handleEditChange}
              className="w-full p-2 mb-2 border rounded"
            />
            <input
              type="text"
              name="金額"
              value={editTarget['金額']}
              onChange={handleEditChange}
              className="w-full p-2 mb-2 border rounded"
            />
            <select
              name="店舗名"
              value={editTarget['店舗名']}
              onChange={handleEditChange}
              className="w-full p-2 mb-2 border rounded"
            >
              <option value="コスモス">コスモス</option>
              <option value="明治屋">明治屋</option>
              <option value="ルミエール">ルミエール</option>
            </select>
            <input
              type="date"
              name="記録日"
              value={editTarget['記録日']}
              onChange={handleEditChange}
              className="w-full p-2 mb-2 border rounded"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded">キャンセル</button>
              <button onClick={handleEditSubmit} className="px-4 py-2 bg-pink-500 text-white rounded">更新</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;