import { TakaIcon, TakaSmallIcon } from "@/components/icons";
import { formatPrice } from "@/lib/format";

/** "৳ 1,99,990  ৳ 2,99,990" price pair from the product cards. */
export function Price({ price, regularPrice }: { price: number; regularPrice: number }) {
  return (
    <>
      <span className="items-center flex gap-1 font-bold text-[20px] max-[640px]:text-[17px] leading-[1.6] tracking-[0%] text-gray-900 whitespace-nowrap">
        <TakaIcon className="dark:[&_path]:fill-[#101518]" />
        {formatPrice(price)}
      </span>
      {regularPrice > price && (
        <span className="text-gray-400 text-[14px] max-[640px]:text-[12px] font-normal leading-[1.6] line-through flex items-center gap-1 pl-1 whitespace-nowrap">
          <TakaSmallIcon />
          {formatPrice(regularPrice)}
        </span>
      )}
    </>
  );
}
