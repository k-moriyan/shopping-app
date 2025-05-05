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
    記録日: '',
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataRef = ref(database, '/products');
    push(dataRef, {
      ...form,
      金額: Number(form.金額),
    });
    setForm({ 商品名: '', 金額: '', 店舗名: 'コスモス', 記録日: '' });
  };

  const formatPrice = (price) => price.toLocaleString();

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">商品入力フォーム</h1>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleDarkMode}
          className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700"
        >
          {darkMode ? '☀️ ライトモード' : '🌙 ダークモード'}
        </motion.button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-2 max-w-md mx-auto">
        <input
          type="text"
          name="商品名"
          placeholder="商品名"
          value={form.商品名}
          onChange={handleChange}
          className="w-full p-2 border rounded dark:bg-gray-800"
        />
        <input
          type="number"
          name="金額"
          placeholder="金額"
          value={form.金額}
          onChange={handleChange}
          className="w-full p-2 border rounded dark:bg-gray-800"
        />
        <select
          name="店舗名"
          value={form.店舗名}
          onChange={handleChange}
          className="w-full p-2 border rounded dark:bg-gray-800"
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
          className="w-full p-2 border rounded dark:bg-gray-800"
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          追加
        </motion.button>
      </form>

      <h2 className="text-lg font-semibold mt-6">商品リスト</h2>
      <ul className="mt-2 space-y-1">
        {products.map((item) => (
          <li key={item.id} className="p-2 border rounded dark:border-gray-700">
            <strong>{item['商品名']}</strong> - {formatPrice(item['金額'])}円 - {item['店舗名']} - {item['記録日']}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
