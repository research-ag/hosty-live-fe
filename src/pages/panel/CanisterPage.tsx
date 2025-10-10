import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Copy,
  Upload,
  CheckCircle,
  AlertCircle,
  Globe,
  ExternalLink,
  UserCheck,
  Settings,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DeployModal } from "../../components/panel/DeployModal";
import { TransferOwnershipModal } from "../../components/panel/TransferOwnershipModal";
import { CustomDomainModal } from "../../components/panel/CustomDomainModal";
import { TooltipWrapper } from "../../components/ui/TooltipWrapper";
import { useCanisters } from "../../hooks/useCanisters";
import { useDeployments } from "../../hooks/useDeployments";
import { useToast } from "../../hooks/useToast";
import { customDomainApi } from "../../api";
import { CustomDomain } from "../../components/ui/CustomDomain";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";

function CyclesValue({ canisterId, isSystemController }: { canisterId: string; isSystemController?: boolean }) {
  const { cyclesRaw, isLoading } = useCanisterStatus(isSystemController === false ? undefined : canisterId)
  if (isSystemController === false) return <>unknown</>
  if (isLoading) return <>…</>
  if (!cyclesRaw) return <>unknown</>
  try {
    const tc = Number(BigInt(cyclesRaw)) / 1_000_000_000_000
    return <>{tc.toFixed(1)} TC</>
  } catch {
    return <>unknown</>
  }
}

export function CanisterPage() {
  const { id: icCanisterId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCanister, addController } = useCanisters();
  const { deployToCanister, deployFromGit } = useDeployments();
  const { toast } = useToast();

  const { domainFromIcDomains } =
    customDomainApi.fetchDomainFromIcDomains.useQuery(
      {
        canisterId: icCanisterId ?? "",
      },
      { enabled: !!icCanisterId }
    );

  const { domainCheckResult, domainCheckResultIsLoading } =
    customDomainApi.checkCustomDomain.useQuery(
      {
        canisterId: icCanisterId ?? "",
      },
      { enabled: !!icCanisterId && !!domainFromIcDomains }
    );

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canister, setCanister] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deployError, setDeployError] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPreviewInteractive, setIsPreviewInteractive] = useState(false);

  // Fetch canister data
  const fetchCanister = async () => {
    if (!icCanisterId) return;

    setIsLoading(true);
    setError("");

    const result = await getCanister(icCanisterId, true);

    if (result.success && result.data) {
      console.log("🎯 [CanisterPage] Canister data received:", result.data);
      setCanister(result.data);
    } else {
      setError(result.error || "Canister not found");
    }

    setIsLoading(false);
  };

  // Load canister on mount
  useEffect(() => {
    fetchCanister();
  }, [icCanisterId]);

  const handleDeploy = async (data: {
    file: File;
    buildCommand: string;
    outputDir: string;
  }) => {
    if (!canister) return;

    setDeployError("");

    const result = await deployToCanister({
      canisterId: canister.id, // Use internal canister ID for deployments
      file: data.file,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir,
    });

    if (result.success) {
      toast.success(
        "Deployment started!",
        "Your application is being deployed. Check the deployments page for progress."
      );
      // Navigate to deployments page to see the new deployment
      navigate("/panel/deployments");
    } else {
      toast.error(
        "Deployment failed",
        result.error || "Failed to start deployment"
      );
      setDeployError(result.error || "Failed to start deployment");
    }
  };

  const handleDeployFromGit = async (data: {
    gitRepoUrl: string;
    branch: string;
    buildCommand: string;
    outputDir: string;
  }) => {
    if (!canister) return;

    setDeployError("");

    const result = await deployFromGit({
      canisterId: canister.id, // Use internal canister ID for deployments
      gitRepoUrl: data.gitRepoUrl,
      branch: data.branch,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir,
    });

    if (result.success) {
      toast.success(
        "Deployment started!",
        "Your application is being deployed from GitHub. Check the deployments page for progress."
      );
      // Navigate to deployments page to see the new deployment
      navigate("/panel/deployments");
    } else {
      toast.error(
        "Deployment failed",
        result.error || "Failed to start deployment from GitHub"
      );
      setDeployError(result.error || "Failed to start deployment from GitHub");
    }
  };

  const handleTransferOwnership = async (userPrincipal: string) => {
    if (!canister) return;

    setTransferError("");
    setIsTransferring(true);

    const result = await addController(canister.id, userPrincipal);

    if (result.success) {
      toast.success(
        "Controller added successfully",
        "The user has been added as a controller to this canister."
      );
      setIsTransferModalOpen(false);
      // Refresh canister data to get updated controller info and system flags
      console.log("=== Hello world");
      fetchCanister();
    } else {
      toast.error(
        "Failed to add controller",
        result.error || "There was an error adding the controller."
      );
      setTransferError(result.error || "Failed to add controller");
    }

    setIsTransferring(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-lg">Loading canister...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {error || "Canister Not Found"}
          </h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Canister Not Found</h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    );
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "inactive":
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatCycles = (cycles: string | number) => {
    if (typeof cycles === "string") {
      return (Number(cycles) / 1_000_000_000_000).toFixed(1);
    }
    return cycles.toFixed(1);
  };

  const canDeploy = canister?.isAssetCanister && canister?.isSystemController;
  const deployTooltip = !canDeploy
    ? "Deployment disabled: System is no longer controller or canister is not an asset canister"
    : undefined;

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/panel/canisters" className="hover:text-foreground">
          Canisters
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{canister.name}</span>
      </nav>

      {/* General Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-2">
            {canister.name || `${canister.icCanisterId?.slice(0, 5)}...`}
          </h1>
          <div className="flex items-center space-x-2">
            {getStatusIcon(canister.status)}
            <Badge
              variant={canister.status === "active" ? "success" : "secondary"}
            >
              {canister.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setIsCustomDomainModalOpen(true)}
            disabled={!canister?.isSystemController}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            Custom Domain
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Ownership
          </Button>
          <TooltipWrapper content={deployTooltip} disabled={!deployTooltip}>
            <Button
              variant="default"
              onClick={() => setIsDeployModalOpen(true)}
              disabled={!canDeploy}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Deploy
            </Button>
          </TooltipWrapper>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!!domainFromIcDomains && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Custom domain
                </label>
                <CustomDomain
                  domain={domainFromIcDomains}
                  checkResult={domainCheckResult}
                  isLoading={domainCheckResultIsLoading}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                IC Canister ID
              </label>
              <p className="text-sm font-mono">{canister.icCanisterId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Cycles
              </label>
              <div className="space-y-1">
                <p className="text-sm">
                  <CyclesValue canisterId={canister.icCanisterId} isSystemController={canister.isSystemController} />
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created
              </label>
              <p className="text-sm">
                {new Date(canister.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Updated
              </label>
              <p className="text-sm">
                {new Date(canister.updatedAt).toLocaleString()}
              </p>
            </div>
            {canister.wasmBinarySize && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  WASM Size
                </label>
                <p className="text-sm">{canister.wasmBinarySize}</p>
              </div>
            )}
            {canister.controllers && canister.controllers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Controllers
                </label>
                <div className="space-y-1">
                  {canister.controllers.map((controller, index) => (
                    <p
                      key={index}
                      className="text-xs font-mono bg-muted px-2 py-1 rounded"
                    >
                      {controller ===
                        import.meta.env.VITE_BACKEND_PRINCIPAL && (
                        <span className="text-primary">(hosty.live) </span>
                      )}
                      {controller}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {canister.isAssetCanister !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Asset Canister
                </label>
                <p className="text-sm">
                  {canister.isAssetCanister ? "Yes" : "No"}
                </p>
              </div>
            )}
            {canister.isSystemController !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Controlled by hosty.live
                </label>
                <p className="text-sm">
                  {canister.isSystemController ? "Yes" : "No"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frontend Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Frontend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canister.frontendUrl ? (
              <div className="space-y-6">
                {/* URL Display with Actions */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Application URL
                  </label>
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="font-mono text-sm text-foreground break-all select-text leading-relaxed mb-3">
                      {canister.frontendUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(canister.frontendUrl, "_blank")
                        }
                        className="h-7 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(canister.frontendUrl!);
                          toast.success("URL copied to clipboard");
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Frontend Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      Preview
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Interactive
                      </label>
                      <button
                        onClick={() =>
                          setIsPreviewInteractive(!isPreviewInteractive)
                        }
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          isPreviewInteractive
                            ? "bg-primary"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            isPreviewInteractive
                              ? "translate-x-3.5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-gray-950">
                    <iframe
                      src={canister.frontendUrl}
                      className="w-full h-96 md:h-[500px] lg:h-[600px] border-0"
                      title="Frontend Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      loading="lazy"
                      style={{
                        pointerEvents: isPreviewInteractive ? "auto" : "none",
                        userSelect: isPreviewInteractive ? "auto" : "none",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {isPreviewInteractive ? "Interactive" : "Static"} preview
                      of your frontend
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(canister.frontendUrl, "_blank")
                      }
                      className="h-7 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open full size
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Frontend Deployed
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  No frontend deployed yet
                </p>
                <TooltipWrapper
                  content={deployTooltip}
                  disabled={!deployTooltip}
                >
                  <Button
                    onClick={() => setIsDeployModalOpen(true)}
                    disabled={!canDeploy}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Deploy Now
                  </Button>
                </TooltipWrapper>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeploy}
        onDeployFromGit={handleDeployFromGit}
        canister={canister}
        error={deployError}
      />

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferOwnership}
        canister={canister}
        isLoading={isTransferring}
        error={transferError}
      />

      <CustomDomainModal
        isOpen={isCustomDomainModalOpen}
        onClose={() => setIsCustomDomainModalOpen(false)}
        canister={canister}
      />
    </div>
  );
}
