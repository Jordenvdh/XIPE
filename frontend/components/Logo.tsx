/**
 * Cenex Nederland Logo Component
 */
import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex flex-col items-center mb-8">
      <Image
        src="/images/cenexNL_logo.png"
        alt="Cenex Nederland Logo"
        width={80}
        height={80}
        className="mb-2"
        style={{ width: 'auto', height: 'auto' }}
        priority
      />
    </div>
  );
}

