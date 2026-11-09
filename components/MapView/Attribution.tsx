"use client";

import { Button } from "@/components/ui/button";

import { Dialog } from "@/components/ui/dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

const Attribution = memo(function Attribution() {
  const t = useTranslations("map");

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild aria-controls="map-attribution-dialog">
        <RefractiveGlass glassThickness={20} bezelWidth={10}>
          <Button type="button" className="mapView-attribution" aria-label={t("attributionLabel")}>
            <span>© OpenStreetMap · CARTO · OpenMapTiles · EOX · Open-Meteo</span>
            <Info size={12} className="size-3" aria-hidden="true" />
          </Button>
        </RefractiveGlass>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mapView-attributionOverlay" />
        <RefractiveGlass brightness={1.1}>
          <Dialog.Content
            id="map-attribution-dialog"
            className="mapView-attributionModal"
          >
            <div className="mapView-attributionHeader">
              <Dialog.Title>{t("attributionLabel")}</Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" className="mapView-attributionClose" aria-label={t("attributionDetails.close")}>
                  <X size={20} className="size-5" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="mapView-attributionBody">
              <Dialog.Description>
                {t("attributionDetails.description")}
              </Dialog.Description>
              <section aria-labelledby="map-attribution-osm">
                <h3 id="map-attribution-osm">OpenStreetMap</h3>
                <p>{t.rich("attributionDetails.osm", {
                  source: (chunks) => <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  license: (chunks) => <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                })}</p>
              </section>
              <section aria-labelledby="map-attribution-carto">
                <h3 id="map-attribution-carto">CARTO</h3>
                <p>{t.rich("attributionDetails.carto", {
                  source: (chunks) => <a href="https://carto.com/attribution/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  schema: (chunks) => <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  codeLicense: (chunks) => <a href="https://github.com/CartoDB/basemap-styles/blob/master/LICENSE.md" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  license: (chunks) => <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                })}</p>
              </section>
              <section aria-labelledby="map-attribution-eox">
                <h3 id="map-attribution-eox">EOxCloudless 2016</h3>
                <p>{t.rich("attributionDetails.eox", {
                  source: (chunks) => <a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  provider: (chunks) => <a href="https://maps.eox.at" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  license: (chunks) => <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                })}</p>
              </section>
              <section aria-labelledby="map-attribution-weather">
                <h3 id="map-attribution-weather">Open-Meteo</h3>
                <p>{t.rich("attributionDetails.weather", {
                  source: (chunks) => <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  license: (chunks) => <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                })}</p>
              </section>
              <section aria-labelledby="map-attribution-pngtree">
                <h3 id="map-attribution-pngtree">Pngtree</h3>
                <p>{t.rich("attributionDetails.clouds", {
                  source: (chunks) => <a href="https://pngtree.com/freepng/cloud-weather-climate_8186751.html" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                  license: (chunks) => <a href="https://pngtree.com/legal/terms-of-license" target="_blank" rel="noopener noreferrer">{chunks}</a>,
                })}</p>
              </section>
              <section aria-labelledby="map-attribution-disclaimer">
                <h3 id="map-attribution-disclaimer">{t("attributionDetails.disclaimerTitle")}</h3>
                <p>{t("disclaimer")}</p>
              </section>
            </div>
            <div className="mapView-attributionFooter">
              <a href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer" className="mr-auto self-center text-xs underline underline-offset-2">
                {t("attributionDetails.thirdPartyNotices")}
              </a>
              <Dialog.Close asChild>
                <GlassButton type="button" primaryColor="darkBlue">{t("attributionDetails.close")}</GlassButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </RefractiveGlass>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

export default Attribution;
