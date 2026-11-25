import {
  FaBicycle,
  FaBottleDroplet,
  FaChurch,
  FaCross,
  FaFlag,
  FaGolfBallTee,
  FaMountainSun,
  FaPersonHiking,
  FaTent,
  FaVanShuttle,
} from "react-icons/fa6";

const ICONS = {
  "turismo-naturaleza": FaMountainSun,
  "turismo-deportivo": FaBicycle,
  "caminos-del-vino": FaBottleDroplet,
  "camino-de-brochero": FaCross,
  "turismo-cultural": FaFlag,
  senderismo: FaPersonHiking,
  golf: FaGolfBallTee,
  "turismo-religioso": FaChurch,
  "ruta-motorhome": FaVanShuttle,
  "parques-y-aventuras": FaTent,
};

export default function Ruta100ExperienceIcon({ code }) {
  const Icon = ICONS[code] || FaMountainSun;
  return <Icon aria-hidden="true" />;
}
