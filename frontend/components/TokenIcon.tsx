import React from 'react'

interface TokenIconProps {
  symbol: string
  className?: string
}

const TOKEN_IMAGES: Record<string, string> = {
  RST: '/sukuna.jpg',
  GST: '/gojo.jpg',
}

// LOGO ETH/BNB RESMI, RST/GST PAKAI FOTO CUSTOM, TOKEN LAIN FALLBACK KE HURUF PERTAMA
export const TokenIcon: React.FC<TokenIconProps> = ({ symbol, className }) => {
  if (symbol === 'ETH') {
    return (
      <svg className={className} viewBox="0 0 784 1277" fill="white">
        <path d="M392.07 0L383.5 29.11V873.74L392.07 882.29L784.13 650.54L392.07 0Z" fillOpacity="0.602" />
        <path d="M392.07 0L0 650.54L392.07 882.29V472.33V0Z" fillOpacity="0.6" />
        <path d="M392.07 956.52L387.24 962.41V1271.67L392.07 1276.86L784.37 724.89L392.07 956.52Z" fillOpacity="0.602" />
        <path d="M392.07 1276.86V956.52L0 724.89L392.07 1276.86Z" fillOpacity="0.6" />
      </svg>
    )
  }

  if (symbol === 'BNB' || symbol === 'WBNB') {
    return (
      <svg className={className} viewBox="0 0 96 96" fill="none">
        <circle cx="48" cy="48" r="48" fill="#0B0E11" />
        <path
          d="M34.5355 42.4676L48.0002 29.0032L61.4717 42.4747L69.3063 34.6397L48.0002 13.3333L26.7007 34.6328L34.5355 42.4676ZM21.1683 40.1646L29.003 47.9993L21.1679 55.8344L13.3333 47.9997L21.1683 40.1646ZM34.5355 53.5322L48.0002 66.9962L61.4714 53.5254L69.3105 61.3562L69.3063 61.3602L48.0002 82.6666L26.7004 61.3672L26.6895 61.3564L34.5355 53.5322ZM82.6674 48.0007L74.8327 55.8353L66.9981 48.0007L74.8327 40.166L82.6674 48.0007Z"
          fill="#F0B90B"
        />
        <path
          d="M55.9466 47.996H55.9502L47.9999 40.0456L40.0457 47.9998L40.0565 48.0109L47.9999 55.9543L55.9539 47.9998L55.9466 47.996Z"
          fill="#F0B90B"
        />
      </svg>
    )
  }

  const image = TOKEN_IMAGES[symbol]
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={symbol} className={`${className ?? ''} rounded-full object-cover`} />
  }

  return <span className="font-bold text-white">{symbol[0]}</span>
}
