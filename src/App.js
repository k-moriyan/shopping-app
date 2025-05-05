import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { database } from './firebase';
import { ref, push, onValue } from 'firebase/database';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [products, setProducts] = useState([]);
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

    const dataRef = ref(database, '/products');
    push(dataRef, {
      ...form,
      金額: Number(form.金額.replace(/,/g, '')),
    });
    setForm({
      商品名: '',
      金額: '',
      店舗名: 'コスモス',
      記録日: new Date().toISOString().split('T')[0],
    });
    setErrors({});
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const formatPrice = (price) => Number(price).toLocaleString();

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

      <h2 className="text-2xl font-semibold mt-8 mb-4">📋 商品リスト</h2>
      <div className="grid gap-4">
        {products.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-pink-100 dark:bg-pink-800 rounded-2xl shadow-md"
          >
            <strong className="text-lg font-semibold">{item['商品名']}</strong>
            <p>💰 {formatPrice(item['金額'])}円</p>
            <p>🏪 {item['店舗名']}</p>
            <p>📅 {formatDisplayDate(item['記録日'])}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
