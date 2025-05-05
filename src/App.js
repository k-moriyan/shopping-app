import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue } from 'firebase/database';

function App() {
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
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataRef = ref(database, '/products');
    push(dataRef, {
      ...form,
      金額: Number(form.金額), // 数値に変換
    });
    setForm({ 商品名: '', 金額: '', 店舗名: 'コスモス', 記録日: '' });
  };

  const formatPrice = (price) => price.toLocaleString();

  return (
    <div className="App">
      <h1>商品入力フォーム</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="商品名"
          placeholder="商品名"
          value={form.商品名}
          onChange={handleChange}
        />
        <input
          type="number"
          name="金額"
          placeholder="金額"
          value={form.金額}
          onChange={handleChange}
        />
        <select name="店舗名" value={form.店舗名} onChange={handleChange}>
          <option value="コスモス">コスモス</option>
          <option value="明治屋">明治屋</option>
          <option value="ルミエール">ルミエール</option>
        </select>
        <input
          type="date"
          name="記録日"
          value={form.記録日}
          onChange={handleChange}
        />
        <button type="submit">追加</button>
      </form>

      <h2>商品リスト</h2>
      <ul>
        {products.map((item) => (
          <li key={item.id}>
            <strong>{item['商品名']}</strong> - {formatPrice(item['金額'])}円 - {item['店舗名']} - {item['記録日']}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
