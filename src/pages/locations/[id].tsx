import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ErrorResponse, LocationWithQuests } from "@/types";
import {
  LocationSignature,
  getLocationSignature,
} from "@/lib/client/localStorage";
import { classed } from "@tw-classed/react";
import { Header } from "@/components/modals/QuestRequirementModal";
import useSettings from "@/hooks/useSettings";
import { AppBackHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { LoadingWrapper } from "@/components/wrappers/LoadingWrapper";
import { LocationDetailPlaceholder } from "@/components/placeholders/LocationDetailPlaceholder";
import { getNonceFromCounterMessage } from "@/lib/client/libhalo";
import { LocationTapModal } from "@/components/modals/LocationTapModal";
import Linkify from "react-linkify";
import { Button } from "@/components/Button";

const Label = classed.span("text-xs text-gray-10 font-light");
const Description = classed.span("text-gray-12 text-sm font-light");

const LocationDetails = () => {
  const { pageWidth } = useSettings();
  const router = useRouter();
  const { id } = router.query;
  const [openTapModal, setOpenTapModal] = useState<boolean>();
  const [location, setLocation] = useState<LocationWithQuests>();
  const [signature, setSignature] = useState<LocationSignature>();
  const [showHint, setShowHint] = useState<boolean>(false);

  const handleShowHint = () => {
    setShowHint(true);
  };

  useEffect(() => {
    const fetchLocation = async () => {
      if (typeof id === "string") {
        try {
          const response = await fetch(`/api/location/${id}`);
          if (!response.ok) {
            const errorResponse: ErrorResponse = await response.json();
            console.error(errorResponse.error);
            toast.error("An error occurred. Please try again.");
            router.push("/");
          } else {
            const data: LocationWithQuests = await response.json();
            setLocation(data);
          }
        } catch (err) {
          toast.error("An error occurred. Please try again.");
          router.push("/");
        }

        const locationSignature = getLocationSignature(id);
        setSignature(locationSignature);

        const tap = router.query.tap;
        if (tap === "true") {
          setOpenTapModal(true);
        } else {
          setOpenTapModal(false);
        }
      }
    };

    fetchLocation();
  }, [router, id]);

  return (
    <div>
      <AppBackHeader redirectTo="/" />
      <LoadingWrapper
        isLoading={!location || openTapModal === undefined}
        fallback={<LocationDetailPlaceholder />}
        className="flex flex-col gap-6"
      >
        {location && openTapModal !== undefined && (
          <LocationTapModal
            location={location}
            signature={signature}
            isOpen={openTapModal}
            setIsOpen={(isOpen) => setOpenTapModal(isOpen)}
          />
        )}
        {location && (
          <>
            <Header title={location.name} label="Location" />
            <div className="flex flex-col gap-4">
              <div
                className="flex bg-slate-200 rounded bg-center bg-cover"
                style={{
                  width: `${pageWidth - 32}px`,
                  height: `${pageWidth - 32}px`,
                  backgroundImage: `url(${location.imageUrl})`,
                }}
              />
              <div className="flex flex-col gap-4 jus">
                <div className="flex flex-col">
                  <Label>This Location</Label>
                  <Description>
                    <Linkify
                      componentDecorator={(
                        decoratedHref,
                        decoratedText,
                        key
                      ) => (
                        <a
                          target="_blank"
                          href={decoratedHref}
                          key={key}
                          style={{ textDecoration: "underline" }}
                        >
                          {decoratedText}
                        </a>
                      )}
                    >
                      {location.infoText}
                    </Linkify>
                  </Description>
                </div>
                {location.description && (
                  <div className="flex flex-col">
                    <Label>Info</Label>
                    <Description>
                      <Linkify
                        componentDecorator={(
                          decoratedHref,
                          decoratedText,
                          key
                        ) => (
                          <a
                            target="_blank"
                            href={decoratedHref}
                            key={key}
                            style={{ textDecoration: "underline" }}
                          >
                            {decoratedText}
                          </a>
                        )}
                      >
                        {location.description}
                      </Linkify>
                    </Description>
                  </div>
                )}
                {location.alternateText ? (
                  showHint ? (
                    <div className="flex flex-col">
                      <Label>Hint (Booooooo)</Label>
                      <Description>
                        <Linkify
                          componentDecorator={(
                            decoratedHref,
                            decoratedText,
                            key
                          ) => (
                            <a
                              target="_blank"
                              href={decoratedHref}
                              key={key}
                              style={{ textDecoration: "underline" }}
                            >
                              {decoratedText}
                            </a>
                          )}
                        >
                          {location.alternateText}
                        </Linkify>
                      </Description>
                    </div>
                  ) : (
                    <Button onClick={handleShowHint}>Stuck?</Button>
                  )
                ) : null}
                {signature !== undefined && (
                  <div className="flex flex-col">
                    <Label>Visited On</Label>
                    <Description>{`${signature.ts}`}</Description>
                  </div>
                )}
                {signature !== undefined &&
                  getNonceFromCounterMessage(signature.msg) !== undefined && (
                    <div className="flex flex-col">
                      <Label>Visitor No.</Label>
                      <Description>{`${getNonceFromCounterMessage(
                        signature.msg
                      )}`}</Description>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </LoadingWrapper>
    </div>
  );
};

LocationDetails.getInitialProps = () => {
  return { fullPage: true };
};

export default LocationDetails;
