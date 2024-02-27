import { Icons } from "@/components/Icons";
import { classed } from "@tw-classed/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { deleteAccountFromLocalStorage } from "@/lib/client/localStorage";
import Profile from "./Profile";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";
import { ProfileDisplayState } from "@/types";
import { Button } from "./Button";

const Title = classed.h3("block text-base text-gray-12 font-light leading-5");
const Subtitle = classed.h4("text-sm text-gray-12 leading-5");
const Description = classed.span("text-sm text-gray-11 leading-5");

const ContentWrapper = classed.div("flex flex-col gap-4 mt-8");

interface AppHeaderContentProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  handleSignout: () => void;
}

interface AppBackHeaderProps {
  redirectTo?: string; // redirect to this page instead of back
  onBackClick?: () => void;
  actions?: ReactNode;
  label?: string;
}

export const AppBackHeader = ({
  redirectTo,
  onBackClick,
  actions,
  label,
}: AppBackHeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center h-[60px]">
      <button
        type="button"
        className="flex items-center gap-1"
        onClick={() => {
          if (typeof onBackClick === "function") {
            onBackClick?.();
          } else {
            if (redirectTo) {
              router.push(redirectTo);
            } else {
              router.back();
            }
          }
        }}
      >
        <Icons.arrowLeft />
        <span className="text-gray-11 text-sm">{label || "Back"}</span>
      </button>
      {actions}
    </div>
  );
};

const AppHeaderContent = ({
  isMenuOpen,
  setIsMenuOpen,
  handleSignout,
}: AppHeaderContentProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });
  const [activeMenuIndex, setActiveMenuIndex] = useState<number>(1);

  const profileViewState: ProfileDisplayState =
    getState().profileView || ProfileDisplayState.VIEW;

  if (!isMenuOpen) return null;

  const MenuItems: { label: string; children: ReactNode }[] = [
    {
      label: "Profile & settings",
      children: <Profile handleSignout={handleSignout} />,
    },
    {
      label: "Information & FAQ's",
      children: (
        <>
          <ContentWrapper>
            <Title>Cursive Quests</Title>
            <Description>
              Unlock unique experiences by tapping NFC chips.
            </Description>
          </ContentWrapper>
          <ContentWrapper>
            <Title>FAQ</Title>
            <div className="flex flex-col gap-2">
              <Subtitle>What is this?</Subtitle>
              <Description>
                Cursive Quests is an experience where you tap NFC chips in order
                to collect digital signatures. Each signature represents a
                person you met, place you visited, or thing you did. Quests
                require you to collect a certain number of signatures from
                specific people or locations, and completing quests unlocks
                unique rewards!
              </Description>
              <Subtitle>Who built this?</Subtitle>
              <Description>
                This app was built by the Cursive team. Cursive is a
                human-centered cryptography lab building applications of digital
                signatures and advanced cryptography. We are interested in
                collaborating with other teams and individuals who want to build
                cryptography centered experiences. If you are interested, please
                reach out from our website!
              </Description>
            </div>
          </ContentWrapper>
          <ContentWrapper>
            <Title>Project Links</Title>
            <div className="flex flex-col gap-2">
              <Subtitle>
                <u>
                  <a
                    href="https://github.com/cursive-team/cursive-quests"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Check out the code on Github
                  </a>
                </u>
              </Subtitle>
              <Subtitle>
                <u>
                  <a
                    href="https://cursive.team"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Learn more about Cursive
                  </a>
                </u>
              </Subtitle>
            </div>
          </ContentWrapper>
          <ContentWrapper>
            <Title>Account</Title>
            <Button
              type="button"
              onClick={() => {
                handleSignout();
              }}
            >
              Logout
            </Button>
          </ContentWrapper>
        </>
      ),
    },
  ];

  const onBack = () => {
    if (
      profileViewState === ProfileDisplayState.CHOOSE_PASSWORD ||
      profileViewState === ProfileDisplayState.INPUT_PASSWORD
    ) {
      actions.updateStateFromAction({
        ...getState(),
        profileView: ProfileDisplayState.VIEW,
      });
      return; //
    }

    if (profileViewState === ProfileDisplayState.EDIT) {
      actions.updateStateFromAction({
        ...getState(),
        profileView: ProfileDisplayState.VIEW,
      });
    }

    setActiveMenuIndex(1);
  };

  const showBackButton = activeMenuIndex !== null;

  return (
    <div className="fixed inset-0 w-full overflow-auto px-3 xs:px-4 z-10 h-full bg-black">
      <div className="flex h-[60px]">
        {/* {showBackButton && (
          <button
            onClick={onBack}
            type="button"
            className="flex gap-2 items-center"
          >
            <Icons.arrowLeft />
            <span className="text-gray-11">Back</span>
          </button>
        )} */}
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            // reset profile view
            actions.updateStateFromAction({
              ...getState(),
              profileView: ProfileDisplayState.VIEW,
            });
          }}
          className="flex gap-3 items-center ml-auto"
        >
          <span className="text-gray-11">Close</span>
          {isMenuOpen ? <Icons.close /> : <Icons.burgher />}
        </button>
      </div>
      <div className="mt-2">
        <div className="flex flex-col gap-6">
          {MenuItems.map((item, index) => {
            if (activeMenuIndex !== null) return null;
            return (
              <Title
                key={item.label}
                onClick={() => {
                  setActiveMenuIndex(index);
                }}
              >
                {item.label}
              </Title>
            );
          })}
        </div>

        {activeMenuIndex !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {MenuItems[activeMenuIndex].children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AppHeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
}
const AppHeader = ({ isMenuOpen, setIsMenuOpen }: AppHeaderProps) => {
  const handleSignout = () => {
    deleteAccountFromLocalStorage();
    window.location.href = "/login";
  };

  return (
    <div className="flex w-full items-center p-3 py-3 xs:p-4 bg-black z-50">
      {!isMenuOpen && (
        <Link href="/">
          <button type="button" className="flex gap-2 items-center">
            <Icons.cursiveFull />
          </button>
        </Link>
      )}

      <div className="flex gap-4 items-center ml-auto">
        <span className="text-gray-11">{isMenuOpen && "Close"}</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <Icons.close /> : <Icons.burgher />}
        </button>
      </div>

      <AppHeaderContent
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleSignout={handleSignout}
      />
    </div>
  );
};

AppHeader.displayName = "AppHeader";

export { AppHeader };
