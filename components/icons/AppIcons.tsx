import React from 'react';
import { SvgXml } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
}

function applyColor(xml: string, color: string): string {
  return xml
    .replace(/stroke="white"/g, `stroke="${color}"`)
    .replace(/fill="white"/g, `fill="${color}"`);
}

const dnaIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M19.25 8.75C30.9167 15.75 30.9167 22.75 19.25 29.75C30.9167 36.75 30.9167 43.75 19.25 50.75" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36.75 8.75C25.0833 15.75 25.0833 22.75 36.75 29.75C25.0833 36.75 25.0833 43.75 36.75 50.75" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 14C28.9665 14 29.75 13.2165 29.75 12.25C29.75 11.2835 28.9665 10.5 28 10.5C27.0335 10.5 26.25 11.2835 26.25 12.25C26.25 13.2165 27.0335 14 28 14Z" fill="white"/>
  <path d="M28 21C28.9665 21 29.75 20.2165 29.75 19.25C29.75 18.2835 28.9665 17.5 28 17.5C27.0335 17.5 26.25 18.2835 26.25 19.25C26.25 20.2165 27.0335 21 28 21Z" fill="white"/>
  <path d="M28 28C28.9665 28 29.75 27.2165 29.75 26.25C29.75 25.2835 28.9665 24.5 28 24.5C27.0335 24.5 26.25 25.2835 26.25 26.25C26.25 27.2165 27.0335 28 28 28Z" fill="white"/>
  <path d="M28 35C28.9665 35 29.75 34.2165 29.75 33.25C29.75 32.2835 28.9665 31.5 28 31.5C27.0335 31.5 26.25 32.2835 26.25 33.25C26.25 34.2165 27.0335 35 28 35Z" fill="white"/>
  <path d="M28 42C28.9665 42 29.75 41.2165 29.75 40.25C29.75 39.2835 28.9665 38.5 28 38.5C27.0335 38.5 26.25 39.2835 26.25 40.25C26.25 41.2165 27.0335 42 28 42Z" fill="white"/>
  <path d="M28 49C28.9665 49 29.75 48.2165 29.75 47.25C29.75 46.2835 28.9665 45.5 28 45.5C27.0335 45.5 26.25 46.2835 26.25 47.25C26.25 48.2165 27.0335 49 28 49Z" fill="white"/>
</svg>`;

export function DnaIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(dnaIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const cowIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M15.2083 29.0942C17.8362 27.8688 18.642 24.0351 17.0081 20.5313C15.3743 17.0275 11.9195 15.1805 9.29169 16.4059C6.66385 17.6313 5.85806 21.465 7.4919 24.9688C9.12574 28.4726 12.5805 30.3196 15.2083 29.0942Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40.7917 29.0942C43.4195 30.3196 46.8743 28.4726 48.5081 24.9688C50.1419 21.465 49.3361 17.6313 46.7083 16.4059C44.0805 15.1805 40.6257 17.0275 38.9919 20.5313C37.358 24.0351 38.1638 27.8688 40.7917 29.0942Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.25 14C18.0833 11.6667 18.0833 9.91667 19.25 8.75" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36.75 14C37.9167 11.6667 37.9167 9.91667 36.75 8.75" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 28C14 21 18.6667 17.5 28 17.5C37.3333 17.5 42 21 42 28V35C42 40.8333 37.3333 43.75 28 43.75C18.6667 43.75 14 40.8333 14 35V28Z" fill="white" fill-opacity="0.1" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24.5 21C26.8333 19.8333 29.1667 19.8333 31.5 21C30.9167 23.3333 29.75 24.5 28 24.5C26.25 24.5 25.0833 23.3333 24.5 21Z" fill="white" fill-opacity="0.25"/>
  <path d="M28 42.875C32.8325 42.875 36.75 40.1327 36.75 36.75C36.75 33.3673 32.8325 30.625 28 30.625C23.1675 30.625 19.25 33.3673 19.25 36.75C19.25 40.1327 23.1675 42.875 28 42.875Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25.375 38.325C25.9549 38.325 26.425 37.6199 26.425 36.75C26.425 35.8802 25.9549 35.175 25.375 35.175C24.7951 35.175 24.325 35.8802 24.325 36.75C24.325 37.6199 24.7951 38.325 25.375 38.325Z" fill="white"/>
  <path d="M30.625 38.325C31.2049 38.325 31.675 37.6199 31.675 36.75C31.675 35.8802 31.2049 35.175 30.625 35.175C30.0451 35.175 29.575 35.8802 29.575 36.75C29.575 37.6199 30.0451 38.325 30.625 38.325Z" fill="white"/>
  <path d="M21.875 30.45C22.7449 30.45 23.45 29.7449 23.45 28.875C23.45 28.0052 22.7449 27.3 21.875 27.3C21.0052 27.3 20.3 28.0052 20.3 28.875C20.3 29.7449 21.0052 30.45 21.875 30.45Z" fill="white"/>
  <path d="M34.125 30.45C34.9949 30.45 35.7 29.7449 35.7 28.875C35.7 28.0052 34.9949 27.3 34.125 27.3C33.2552 27.3 32.55 28.0052 32.55 28.875C32.55 29.7449 33.2552 30.45 34.125 30.45Z" fill="white"/>
  <path d="M24.5 40.25C26.8333 41.4167 29.1667 41.4167 31.5 40.25" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function CowIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(cowIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const scaleIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M43.75 36.75H12.25C10.317 36.75 8.75 38.317 8.75 40.25V45.5C8.75 47.433 10.317 49 12.25 49H43.75C45.683 49 47.25 47.433 47.25 45.5V40.25C47.25 38.317 45.683 36.75 43.75 36.75Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M42 31.5H14C13.0335 31.5 12.25 32.2835 12.25 33.25V35C12.25 35.9665 13.0335 36.75 14 36.75H42C42.9665 36.75 43.75 35.9665 43.75 35V33.25C43.75 32.2835 42.9665 31.5 42 31.5Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M35 40.25H21C20.0335 40.25 19.25 41.0335 19.25 42V45.5C19.25 46.4665 20.0335 47.25 21 47.25H35C35.9665 47.25 36.75 46.4665 36.75 45.5V42C36.75 41.0335 35.9665 40.25 35 40.25Z" fill="white" fill-opacity="0.3"/>
  <path d="M22.75 43.75H26.25M28 43.75H31.5" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 28.875C32.8325 28.875 36.75 26.1327 36.75 22.75C36.75 19.3673 32.8325 16.625 28 16.625C23.1675 16.625 19.25 19.3673 19.25 22.75C19.25 26.1327 23.1675 28.875 28 28.875Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25.375 23.5375C25.8099 23.5375 26.1625 23.1849 26.1625 22.75C26.1625 22.3151 25.8099 21.9625 25.375 21.9625C24.9401 21.9625 24.5875 22.3151 24.5875 22.75C24.5875 23.1849 24.9401 23.5375 25.375 23.5375Z" fill="white"/>
  <path d="M29.75 23.5375C30.1849 23.5375 30.5375 23.1849 30.5375 22.75C30.5375 22.3151 30.1849 21.9625 29.75 21.9625C29.3151 21.9625 28.9625 22.3151 28.9625 22.75C28.9625 23.1849 29.3151 23.5375 29.75 23.5375Z" fill="white"/>
  <path d="M28 28C29.4497 28 30.625 27.2165 30.625 26.25C30.625 25.2835 29.4497 24.5 28 24.5C26.5503 24.5 25.375 25.2835 25.375 26.25C25.375 27.2165 26.5503 28 28 28Z" fill="white" fill-opacity="0.3" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 21.4375C21.9665 21.4375 22.75 20.4581 22.75 19.25C22.75 18.0419 21.9665 17.0625 21 17.0625C20.0335 17.0625 19.25 18.0419 19.25 19.25C19.25 20.4581 20.0335 21.4375 21 21.4375Z" fill="white" fill-opacity="0.25"/>
  <path d="M35 21.4375C35.9665 21.4375 36.75 20.4581 36.75 19.25C36.75 18.0419 35.9665 17.0625 35 17.0625C34.0335 17.0625 33.25 18.0419 33.25 19.25C33.25 20.4581 34.0335 21.4375 35 21.4375Z" fill="white" fill-opacity="0.25"/>
</svg>`;

export function ScaleIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(scaleIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const plusAnimalIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.35411 27.672C10.668 27.0593 11.0709 25.1425 10.254 23.3906C9.43708 21.6387 7.7097 20.7152 6.39578 21.3279C5.08186 21.9406 4.67897 23.8574 5.49589 25.6093C6.31281 27.3612 8.04019 28.2847 9.35411 27.672Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27.3958 27.672C28.7097 28.2847 30.4371 27.3612 31.254 25.6093C32.071 23.8574 31.6681 21.9406 30.3542 21.3279C29.0402 20.7152 27.3129 21.6387 26.4959 23.3906C25.679 25.1425 26.0819 27.0593 27.3958 27.672Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.75 28C8.75 22.1667 11.9583 19.25 18.375 19.25C24.7917 19.25 28 22.1667 28 28V33.25C28 37.9167 24.7917 40.25 18.375 40.25C11.9583 40.25 8.75 37.9167 8.75 33.25V28Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 28.2625C14.6283 28.2625 15.1375 27.7533 15.1375 27.125C15.1375 26.4968 14.6283 25.9875 14 25.9875C13.3718 25.9875 12.8625 26.4968 12.8625 27.125C12.8625 27.7533 13.3718 28.2625 14 28.2625Z" fill="white"/>
  <path d="M22.75 28.2625C23.3783 28.2625 23.8875 27.7533 23.8875 27.125C23.8875 26.4968 23.3783 25.9875 22.75 25.9875C22.1218 25.9875 21.6125 26.4968 21.6125 27.125C21.6125 27.7533 22.1218 28.2625 22.75 28.2625Z" fill="white"/>
  <path d="M18.375 38.5C21.2745 38.5 23.625 36.933 23.625 35C23.625 33.067 21.2745 31.5 18.375 31.5C15.4755 31.5 13.125 33.067 13.125 35C13.125 36.933 15.4755 38.5 18.375 38.5Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16.625 36.05C17.0116 36.05 17.325 35.5799 17.325 35C17.325 34.4201 17.0116 33.95 16.625 33.95C16.2384 33.95 15.925 34.4201 15.925 35C15.925 35.5799 16.2384 36.05 16.625 36.05Z" fill="white"/>
  <path d="M20.125 36.05C20.5116 36.05 20.825 35.5799 20.825 35C20.825 34.4201 20.5116 33.95 20.125 33.95C19.7384 33.95 19.425 34.4201 19.425 35C19.425 35.5799 19.7384 36.05 20.125 36.05Z" fill="white"/>
  <path d="M42 49.875C47.3157 49.875 51.625 45.5657 51.625 40.25C51.625 34.9343 47.3157 30.625 42 30.625C36.6843 30.625 32.375 34.9343 32.375 40.25C32.375 45.5657 36.6843 49.875 42 49.875Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M42 35V45.5" stroke="white" stroke-width="2.625" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36.75 40.25H47.25" stroke="white" stroke-width="2.625" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function PlusAnimalIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(plusAnimalIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const movementsIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.4977 31.496H6.99907C5.06632 31.496 3.49951 33.0628 3.49951 34.9955V45.4942C3.49951 47.4269 5.06632 48.9938 6.99907 48.9938H17.4977C19.4305 48.9938 20.9973 47.4269 20.9973 45.4942V34.9955C20.9973 33.0628 19.4305 31.496 17.4977 31.496Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.18722" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6.99915 48.9938V45.4943M12.2485 48.9938V45.4943M17.4978 48.9938V45.4943" stroke="white" stroke-width="1.74978" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M48.9938 31.496H38.4952C36.5624 31.496 34.9956 33.0628 34.9956 34.9955V45.4942C34.9956 47.4269 36.5624 48.9938 38.4952 48.9938H48.9938C50.9266 48.9938 52.4934 47.4269 52.4934 45.4942V34.9955C52.4934 33.0628 50.9266 31.496 48.9938 31.496Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.18722" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M38.4951 48.9938V45.4943M43.7445 48.9938V45.4943M48.9938 48.9938V45.4943" stroke="white" stroke-width="1.74978" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12.2484 15.748H43.7444" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M38.4951 10.4987L43.7445 15.748L38.4951 20.9973" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M43.7444 26.2467H12.2484" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17.4977 20.9973L12.2484 26.2466L17.4977 31.496" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function MovementsIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(movementsIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const healthIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M43.7445 12.2484L48.9938 17.4977" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
  <g >    <path d="M38.4951 17.4978L45.4942 10.4987L48.9938 13.9982L41.9947 20.9973" fill="white" fill-opacity="0.2"/>
    <path d="M38.4951 17.4978L45.4942 10.4987L48.9938 13.9982L41.9947 20.9973" stroke="white" stroke-width="2.18722" stroke-linecap="round" stroke-linejoin="round"/>
</g>
  <path d="M15.748 43.7445L12.2484 40.2449L36.7453 15.748L40.2449 19.2476L15.748 43.7445Z" fill="white" fill-opacity="0.18" stroke="white" stroke-width="2.18722" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.2476 47.244L8.7489 36.7454" stroke="white" stroke-width="2.62467" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34.9956 13.9982L41.9947 20.9973" stroke="white" stroke-width="1.74978" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M38.4951 10.4987L45.4942 17.4978" stroke="white" stroke-width="1.74978" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12.2484 48.9938C11.0819 50.1603 11.0819 51.3268 12.2484 52.4933C13.4149 51.3268 13.4149 50.1603 12.2484 48.9938Z" fill="white" fill-opacity="0.5"/>
  <path d="M19.2476 50.7435C18.0811 51.91 18.0811 53.0766 19.2476 54.2431C20.4141 53.0766 20.4141 51.91 19.2476 50.7435Z" fill="white" fill-opacity="0.4"/>
</svg>`;

export function HealthIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(healthIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const fileUploadIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 6H30L39 15V42H12V6Z" fill="white" fill-opacity="0.12" stroke="white" stroke-width="1.875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M30 6V15H39" stroke="white" stroke-width="1.875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25.5 33V22.5" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 27L25.5 22.5L30 27" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function FileUploadIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(fileUploadIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

// ── Iconos del Dashboard Principal (Figma, viewBox 0 0 80 80) ──────────────────

const herdIconSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.99902 67.4865C14.997 64.1538 26.6614 63.3207 39.992 64.987C53.3227 66.6533 64.987 66.6533 74.985 64.987" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12.4975 69.986V67.4865" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27.4945 71.2358V68.7363" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M62.4875 71.2358V68.7363" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16.124 37.5905C18.3134 36.5695 19.0242 33.4599 17.7115 30.6449C16.3989 27.8299 13.5599 26.3756 11.3705 27.3965C9.18107 28.4175 8.4703 31.5271 9.78294 34.3421C11.0956 37.1571 13.9346 38.6114 16.124 37.5905Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M33.866 37.5905C36.0554 38.6114 38.8944 37.1571 40.2071 34.3421C41.5197 31.5271 40.8089 28.4175 38.6195 27.3965C36.4301 26.3756 33.5911 27.8299 32.2785 30.6449C30.9658 33.4599 31.6766 36.5695 33.866 37.5905Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18.7463 23.7453C17.9131 21.2458 17.9131 19.1628 18.7463 17.4965" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M31.2438 23.7453C32.0769 21.2458 32.0769 19.1628 31.2438 17.4965" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12.4975 37.4925C12.4975 29.1608 16.6633 24.995 24.995 24.995C33.3267 24.995 37.4925 29.1608 37.4925 37.4925V47.4905C37.4925 54.1558 33.3267 57.4885 24.995 57.4885C16.6633 57.4885 12.4975 54.1558 12.4975 47.4905V37.4925Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.996 29.994C23.3286 28.3277 26.6613 28.3277 29.994 29.994C29.1608 32.4935 27.4945 33.7432 24.995 33.7432C22.4955 33.7432 20.8291 32.4935 19.996 29.994Z" fill="white" fill-opacity="0.3"/>
  <path d="M24.995 55.6139C29.1363 55.6139 32.4935 53.096 32.4935 49.99C32.4935 46.884 29.1363 44.3661 24.995 44.3661C20.8537 44.3661 17.4965 46.884 17.4965 49.99C17.4965 53.096 20.8537 55.6139 24.995 55.6139Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22.4955 51.4897C23.0477 51.4897 23.4953 50.8183 23.4953 49.99C23.4953 49.1617 23.0477 48.4903 22.4955 48.4903C21.9434 48.4903 21.4957 49.1617 21.4957 49.99C21.4957 50.8183 21.9434 51.4897 22.4955 51.4897Z" fill="white"/>
  <path d="M27.4945 51.4897C28.0467 51.4897 28.4943 50.8183 28.4943 49.99C28.4943 49.1617 28.0467 48.4903 27.4945 48.4903C26.9423 48.4903 26.4947 49.1617 26.4947 49.99C26.4947 50.8183 26.9423 51.4897 27.4945 51.4897Z" fill="white"/>
  <path d="M19.3711 41.4917C20.1994 41.4917 20.8708 40.8203 20.8708 39.992C20.8708 39.1637 20.1994 38.4923 19.3711 38.4923C18.5428 38.4923 17.8714 39.1637 17.8714 39.992C17.8714 40.8203 18.5428 41.4917 19.3711 41.4917Z" fill="white"/>
  <path d="M30.6189 41.4917C31.4472 41.4917 32.1186 40.8203 32.1186 39.992C32.1186 39.1637 31.4472 38.4923 30.6189 38.4923C29.7906 38.4923 29.1192 39.1637 29.1192 39.992C29.1192 40.8203 29.7906 41.4917 30.6189 41.4917Z" fill="white"/>
  <path d="M21.2457 53.7393C23.7452 54.989 26.2447 54.989 28.7442 53.7393" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M49.1807 46.116C50.7445 45.3868 51.2556 43.1728 50.3222 41.1711C49.3887 39.1693 47.3643 38.1377 45.8004 38.867C44.2365 39.5962 43.7254 41.8102 44.6589 43.8119C45.5923 45.8137 47.6168 46.8453 49.1807 46.116Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M63.2968 46.116C64.8607 46.8452 66.8852 45.8137 67.8186 43.8119C68.7521 41.8102 68.241 39.5962 66.6771 38.867C65.1132 38.1377 63.0888 39.1693 62.1553 41.1711C61.2219 43.1728 61.733 45.3868 63.2968 46.116Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46.2407 47.4905C46.2407 40.8252 49.5734 37.4925 56.2387 37.4925C62.9041 37.4925 66.2367 40.8252 66.2367 47.4905V54.989C66.2367 59.988 62.9041 62.4875 56.2387 62.4875C49.5734 62.4875 46.2407 59.988 46.2407 54.989V47.4905Z" fill="white" fill-opacity="0.18" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M56.2388 43.7412C58.3094 43.7412 59.988 42.6222 59.988 41.2417C59.988 39.8613 58.3094 38.7422 56.2388 38.7422C54.1681 38.7422 52.4895 39.8613 52.4895 41.2417C52.4895 42.6222 54.1681 43.7412 56.2388 43.7412Z" fill="white" fill-opacity="0.3"/>
  <path d="M56.2387 60.6129C59.3447 60.6129 61.8626 58.6545 61.8626 56.2387C61.8626 53.823 59.3447 51.8646 56.2387 51.8646C53.1328 51.8646 50.6149 53.823 50.6149 56.2387C50.6149 58.6545 53.1328 60.6129 56.2387 60.6129Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M54.3641 57.4885C54.7782 57.4885 55.114 56.929 55.114 56.2387C55.114 55.5485 54.7782 54.989 54.3641 54.989C53.95 54.989 53.6143 55.5485 53.6143 56.2387C53.6143 56.929 53.95 57.4885 54.3641 57.4885Z" fill="white"/>
  <path d="M58.1134 57.4885C58.5275 57.4885 58.8632 56.929 58.8632 56.2387C58.8632 55.5485 58.5275 54.989 58.1134 54.989C57.6992 54.989 57.3635 55.5485 57.3635 56.2387C57.3635 56.929 57.6992 57.4885 58.1134 57.4885Z" fill="white"/>
  <path d="M52.4895 48.7403C53.1797 48.7403 53.7392 48.1807 53.7392 47.4905C53.7392 46.8003 53.1797 46.2408 52.4895 46.2408C51.7993 46.2408 51.2397 46.8003 51.2397 47.4905C51.2397 48.1807 51.7993 48.7403 52.4895 48.7403Z" fill="white"/>
  <path d="M59.988 48.7403C60.6782 48.7403 61.2378 48.1807 61.2378 47.4905C61.2378 46.8003 60.6782 46.2408 59.988 46.2408C59.2978 46.2408 58.7383 46.8003 58.7383 47.4905C58.7383 48.1807 59.2978 48.7403 59.988 48.7403Z" fill="white"/>
  <path d="M53.7393 59.3631C55.4056 60.1963 57.0719 60.1963 58.7383 59.3631" stroke="white" stroke-width="2.24955" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M41.2418 34.993C40.4086 33.3267 39.5754 32.9101 38.7423 33.7432C38.3257 34.993 39.1589 36.2427 41.2418 37.4925C43.3247 36.2427 44.1579 34.993 43.7413 33.7432C42.9081 32.9101 42.0749 33.3267 41.2418 34.993Z" fill="white" fill-opacity="0.5"/>
</svg>`;

export function HerdIcon({ color = 'white', size = 80 }: IconProps) {
  const xml = applyColor(herdIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const notebookIconSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M56.2388 12.4975H23.7453C20.2942 12.4975 17.4965 15.2952 17.4965 18.7462V63.7372C17.4965 67.1883 20.2942 69.986 23.7453 69.986H56.2388C59.6899 69.986 62.4875 67.1883 62.4875 63.7372V18.7462C62.4875 15.2952 59.6899 12.4975 56.2388 12.4975Z" fill="white" fill-opacity="0.12" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17.4965 22.4955H62.4875" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17.4965 29.3691C18.5318 29.3691 19.3711 28.5298 19.3711 27.4945C19.3711 26.4592 18.5318 25.6199 17.4965 25.6199C16.4612 25.6199 15.6219 26.4592 15.6219 27.4945C15.6219 28.5298 16.4612 29.3691 17.4965 29.3691Z" fill="white"/>
  <path d="M17.4965 41.8666C18.5318 41.8666 19.3711 41.0273 19.3711 39.992C19.3711 38.9567 18.5318 38.1174 17.4965 38.1174C16.4612 38.1174 15.6219 38.9567 15.6219 39.992C15.6219 41.0273 16.4612 41.8666 17.4965 41.8666Z" fill="white"/>
  <path d="M17.4965 54.3641C18.5318 54.3641 19.3711 53.5248 19.3711 52.4895C19.3711 51.4542 18.5318 50.6149 17.4965 50.6149C16.4612 50.6149 15.6219 51.4542 15.6219 52.4895C15.6219 53.5248 16.4612 54.3641 17.4965 54.3641Z" fill="white"/>
  <path d="M27.4945 34.993H54.989" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27.4945 44.991H52.4895" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27.4945 54.989H47.4905" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M49.99 59.988L51.2397 62.4875L53.7392 63.1124L51.8646 64.987L52.4895 67.4865L49.99 66.2368L47.4905 67.4865L48.1153 64.987L46.2407 63.1124L48.7402 62.4875L49.99 59.988Z" fill="white" fill-opacity="0.4" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function NotebookIcon({ color = 'white', size = 80 }: IconProps) {
  const xml = applyColor(notebookIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const barnIconSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.99799 34.993L39.992 14.997L69.986 34.993H9.99799Z" fill="white" fill-opacity="0.2" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17.4965 34.993V67.4865H62.4875V34.993" fill="white" fill-opacity="0.1" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32.4935 67.4865V47.4905C32.4935 44.1578 34.993 42.4915 39.992 42.4915C44.991 42.4915 47.4905 44.1578 47.4905 47.4905V67.4865" fill="white" fill-opacity="0.25" stroke="white" stroke-width="3.12438" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32.4935 47.4905L47.4905 62.4875" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M47.4905 47.4905L32.4935 62.4875" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M39.992 29.994C38.3257 27.4945 36.6594 27.0779 34.993 28.7442C34.1599 30.4106 35.8262 32.4935 39.992 34.993C44.1579 32.4935 45.8242 30.4106 44.991 28.7442C43.3247 27.0779 41.6584 27.4945 39.992 29.994Z" fill="white" fill-opacity="0.3"/>
  <path d="M7.49847 69.986C10.8311 66.6533 14.1638 66.6533 17.4965 69.986" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M62.4875 69.986C65.8202 66.6533 69.1528 66.6533 72.4855 69.986" stroke="white" stroke-width="2.4995" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function BarnIcon({ color = 'white', size = 80 }: IconProps) {
  const xml = applyColor(barnIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const weightsBarIconSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 68H70" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <path d="M14 68V13" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <rect x="19" y="52" width="13" height="16" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5"/>
  <rect x="37" y="37" width="13" height="31" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5"/>
  <rect x="55" y="22" width="13" height="46" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5"/>
  <circle cx="25.5" cy="49" r="3.5" fill="white"/>
  <circle cx="43.5" cy="34" r="3.5" fill="white"/>
  <circle cx="61.5" cy="19" r="3.5" fill="white"/>
  <path d="M25.5 49L43.5 34L61.5 19" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function WeightsBarIcon({ color = 'white', size = 80 }: IconProps) {
  const xml = applyColor(weightsBarIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const treatmentIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="17" y="17" width="22" height="28" rx="5" fill="white" fill-opacity="0.12" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="21" y="11" width="14" height="8" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="24" y="7.5" width="8" height="5.5" rx="1.5" fill="white" fill-opacity="0.3"/>
  <path d="M28 26V36" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M23 31H33" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

export function TreatmentIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(treatmentIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const incidentIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 8L51 47H5L28 8Z" fill="white" fill-opacity="0.12" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 22V35" stroke="white" stroke-width="2.625" stroke-linecap="round"/>
  <circle cx="28" cy="40.5" r="2.25" fill="white"/>
</svg>`;

export function IncidentIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(incidentIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const diagnosisIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="14" y="10" width="28" height="38" rx="5" fill="white" fill-opacity="0.12" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="21" y="6" width="14" height="8" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 29L25 34L36 22" stroke="white" stroke-width="2.625" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function DiagnosisIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(diagnosisIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const birthIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 41C28 41 12 30.5 12 19.5C12 13.5 16.5 9.5 21.5 9.5C24.5 9.5 27 11.5 28 14.5C29 11.5 31.5 9.5 34.5 9.5C39.5 9.5 44 13.5 44 19.5C44 30.5 28 41 28 41Z" fill="white" fill-opacity="0.18" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M42.5 6L44 10.5L48.5 12L44 13.5L42.5 18L41 13.5L36.5 12L41 10.5L42.5 6Z" fill="white" fill-opacity="0.6"/>
</svg>`;

export function BirthIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(birthIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const feedIconSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 22L28 12L46 22L28 32L10 22Z" fill="white" fill-opacity="0.18" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 26V38C16 38 20 42 28 42C36 42 40 38 40 38V26" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 22V30" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 22V30" stroke="white" stroke-width="2.1875" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function FeedIcon({ color = 'white', size = 56 }: IconProps) {
  const xml = applyColor(feedIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

const syncIconSvg = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.12244 13.9943C6.12244 9.91264 8.74634 7.87183 13.9941 7.87183C16.9096 7.87183 19.242 9.03801 20.9912 11.3704" stroke="white" stroke-opacity="0.75" stroke-width="1.09329" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21.8659 13.9941C21.8659 18.0758 19.242 20.1166 13.9941 20.1166C11.0787 20.1166 8.74634 18.9504 6.99707 16.618" stroke="white" stroke-opacity="0.75" stroke-width="1.09329" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18.3673 9.62109L20.9912 11.3704L20.1166 13.9943" stroke="white" stroke-opacity="0.75" stroke-width="1.09329" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9.62097 18.3673L6.99707 16.618L7.8717 13.9941" stroke="white" stroke-opacity="0.75" stroke-width="1.09329" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function SyncIcon({ color = 'white', size = 28 }: IconProps) {
  const xml = applyColor(syncIconSvg, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
