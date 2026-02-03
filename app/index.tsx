import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href={"/views/auth/Inicio" as any }/>;
}