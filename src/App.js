import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('すべて');
  const [editTarget, setEditTarget] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    商品名: '',
    金額: '',
    店舗名: 'コスモス',
    記録日: today,
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

  const productNames = [...new Set(products.map((p) => p['商品名']))];

  const filteredProducts =
    selectedProduct === 'すべて'
      ? products
      : products.filter((p) => p['商品名'] === selectedProduct);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === '金額') {
      const numericValue = value.replace(/[^\d]/g, '');
      const formatted = numericValue ? Number(numericValue).toLocaleString() : '';
      setForm({ ...form, [name]: formatted });
    } else {
      setForm({ ...form, [name]: value });
    }
    setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!form.商品名.trim()) newErrors.商品名 = '商品名を入力してください。';
    const numericPrice = Number(form.金額.replace(/,/g, ''));
    if (form.金額.trim() === '' || isNaN(numericPrice) || numericPrice < 0)
      newErrors.金額 = '金額は0以上の数字を入力してください。';
    if (!form.店舗名.trim()) newErrors.店舗名 = '店舗名を選択してください。';
    if (form.記録日 > today) newErrors.記録日 = '未来の日付は選択できません。';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload = { ...form, 金額: numericPrice };

    push(ref(database, '/products'), payload);
    setForm({ 商品名: '', 金額: '', 店舗名: 'コスモス', 記録日: today });
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
    setEditErrors({});
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
    setEditErrors({ ...editErrors, [name]: '' });
  };

  const handleEditSubmit = () => {
    let newErrors = {};

    if (!editTarget.商品名.trim()) newErrors.商品名 = '商品名を入力してください。';
    const numericPrice = Number(editTarget.金額.replace(/,/g, ''));
    if (editTarget.金額.trim() === '' || isNaN(numericPrice) || numericPrice < 0)
      newErrors.金額 = '金額は0以上の数字を入力してください。';
    if (!editTarget.店舗名.trim()) newErrors.店舗名 = '店舗名を選択してください。';
    if (editTarget.記録日 > today) newErrors.記録日 = '未来の日付は選択できません。';

    setEditErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (window.confirm('更新しますか？')) {
      const dataRef = ref(database, `/products/${editTarget.id}`);
      update(dataRef, {
        商品名: editTarget['商品名'],
        金額: numericPrice,
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
    <div className="min-h-screen font-rounded bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
      <header className="bg-lightblue-200 text-gray-800 p-4 flex justify-between items-center dark:bg-gray-800">
        <h1 className="text-2xl font-bold">Shopping Journal</h1>
        <button
          onClick={toggleDarkMode}
          className="rounded-md px-3 py-1 bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition"
        >
          {darkMode ? 'ライトモード' : 'ダークモード'}
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">最安値一覧</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(lowestPrices).map(([name, { price, store }]) => (
              <div key={name} className="rounded-md shadow-sm p-4 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-medium">{name}</h3>
                <p className="text-sm">💰 {formatPrice(price)}円</p>
                <p className="text-sm">🏪 {store}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">新規購入入力</h2>
          <form onSubmit={handleSubmit} className="rounded-md shadow-sm p-6 bg-white dark:bg-gray-800 space-y-4">
            <div>
              <input
                type="text"
                name="商品名"
                placeholder="商品名"
                value={form.商品名}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
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
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
              />
              {errors.金額 && <p className="text-red-500 text-sm mt-1">{errors.金額}</p>}
            </div>

            <div>
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
              {errors.店舗名 && <p className="text-red-500 text-sm mt-1">{errors.店舗名}</p>}
            </div>

            <div>
              <input
                type="date"
                name="記録日"
                max={today}
                value={form.記録日}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
              />
              {errors.記録日 && <p className="text-red-500 text-sm mt-1">{errors.記録日}</p>}
            </div>

            <button
              type="submit"
              className="w-full p-3 rounded-md bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 dark:bg-lightblue-500 dark:text-gray-900 dark:hover:bg-lightblue-600 transition"
            >
              ➕ 追加
            </button>
          </form>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">購入履歴</h2>
          <div className="mb-4">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-3 border rounded-md"
            >
              <option value="すべて">すべて</option>
              {productNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-md w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">編集</h2>
                <input
                  type="text"
                  name="商品名"
                  value={editTarget['商品名']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-2 border rounded-md"
                />
                {editErrors.商品名 && <p className="text-red-500 text-sm mb-2">{editErrors.商品名}</p>}
                <input
                  type="text"
                  name="金額"
                  value={editTarget['金額']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-2 border rounded-md"
                />
                {editErrors.金額 && <p className="text-red-500 text-sm mb-2">{editErrors.金額}</p>}
                <input
                  type="text"
                  name="店舗名"
                  value={editTarget['店舗名']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-2 border rounded-md"
                />
                {editErrors.店舗名 && <p className="text-red-500 text-sm mb-2">{editErrors.店舗名}</p>}
                <input
                  type="date"
                  name="記録日"
                  max={today}
                  value={editTarget['記録日']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-4 border rounded-md"
                />
                {editErrors.記録日 && <p className="text-red-500 text-sm mb-2">{editErrors.記録日}</p>}
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-400 rounded-md hover:bg-gray-500 transition">キャンセル</button>
                  <button onClick={handleEditSubmit} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">更新</button>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-4">
            {filteredProducts.map((item) => (
              <div key={item.id} className="rounded-md shadow-sm p-4 flex justify-between items-center bg-white dark:bg-gray-800">
                <div>
                  <h3 className="text-lg font-medium">{item['商品名']}</h3>
                  <p className="text-sm">💰 {formatPrice(item['金額'])}円</p>
                  <p className="text-sm">📅 {formatDisplayDate(item['記録日'])}</p>
                  <p className="text-sm">🏪 {item['店舗名']}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="px-3 py-1 rounded-md bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 transition dark:bg-yellow-500 dark:text-gray-900 dark:hover:bg-yellow-600">編集</button>
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition">削除</button>
                </div>
              </div>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
