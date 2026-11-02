export const REFRACTIVE_GLASS_CONFIG = {
  // Độ mờ của nền trước khi khúc xạ, tính bằng px.
  blur: 2,
  // Độ sáng của nền kính; 1 giữ nguyên, nhỏ hơn 1 tối hơn, lớn hơn 1 sáng hơn.
  brightness: 1,
  // Bề rộng tối đa của vùng khúc xạ ở viền, tính bằng px.
  bezelWidth: 25,
  // Giới hạn bề rộng viền theo tỷ lệ bán kính bo góc của từng phần tử.
  bezelRadiusRatio: 2,
  // Độ dày mô phỏng của kính (px) và chiết suất; tăng để nền bị bẻ mạnh hơn.
  glassThickness: 50,
  refractiveIndex: 1.5,
  // Giới hạn độ dịch chuyển nền, tính bằng px; đây là mức trần, không phải hệ số nhân.
  maxDisplacement: 100,
} as const;
