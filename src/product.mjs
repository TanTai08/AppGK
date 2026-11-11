// Only these four properties may be written to a product record.
export function productData(input) {
  const { name, price, soluong, image } = input;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
    throw new Error("Tên sản phẩm phải có từ 1 đến 120 ký tự.");
  if (!Number.isFinite(price) || price < 0 || price > 1e12)
    throw new Error("Giá phải là số không âm, tối đa 1.000 tỷ VNĐ.");
  if (!Number.isSafeInteger(soluong) || soluong < 0 || soluong > 1e9)
    throw new Error("Số lượng phải là số nguyên không âm, tối đa 1 tỷ.");
  if (
    typeof image !== "string" ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image) ||
    image.length > 1000000
  )
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP nhỏ hơn 700 KB.");
  return { name: name.trim(), price, soluong, image };
}
