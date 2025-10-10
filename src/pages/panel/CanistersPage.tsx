import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Server,
  Zap,
  Gift,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { SortButton } from "../../components/ui/SortButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { CreateCanisterModal } from "../../components/panel/CreateCanisterModal";
import { DeleteCanisterModal } from "../../components/panel/DeleteCanisterModal";
import { useCanisters } from "../../hooks/useCanisters";
import { useToast } from "../../hooks/useToast";
import { useTCycles } from "../../hooks/useTCycles";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { TopUpCanisterModal } from "../../components/panel/TopUpCanisterModal";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";
import { TooltipWrapper } from "../../components/ui/TooltipWrapper";
import { profileApi, freeCanisterApi } from "../../services/api";
import type { Profile, Canister } from "../../types";

function CyclesCell({
  canisterId,
  isSystemController,
}: {
  canisterId: string;
  isSystemController: boolean;
}) {
  const { cyclesRaw, isLoading } = useCanisterStatus(
    isSystemController ? canisterId : undefined
  );
  if (!isSystemController) return <>unknown</>;
  if (isLoading) return <>…</>;
  if (!cyclesRaw) return <>unknown</>;
  try {
    const tc = Number(BigInt(cyclesRaw)) / 1_000_000_000_000;
    return <>{tc.toFixed(1)} TC</>;
  } catch {
    return <>unknown</>;
  }
}

export function CanistersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useInternetIdentity();
  const { withdrawToCanister, balanceRaw, formatTC, refresh } =
    useTCycles(principal);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpCanisterId, setTopUpCanisterId] = useState<string | null>(null);

  // Read initial state from URL parameters
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialSortField: keyof Canister =
    (searchParams.get("sortBy") as keyof Canister) || "name";
  const initialSortDirection =
    (searchParams.get("sortDirection") as "asc" | "desc") || "asc";

  const {
    canisters,
    isLoading: canistersLoading,
    error: canistersError,
    createCanister,
    deleteCanister,
    refreshCanisters,
  } = useCanisters();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [canisterToDelete, setCanisterToDelete] = useState<Canister | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sortField, setSortField] = useState<keyof Canister>(initialSortField);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  // Free canister state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isClaimingFree, setIsClaimingFree] = useState(false);

  const itemsPerPage = 9;
  const totalPages = Math.ceil(canisters.length / itemsPerPage);

  // Fetch user profile to check if free canister is available
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      const result = await profileApi.getProfile();
      if (result.success && result.data) {
        setProfile(result.data);
      }
      setIsLoadingProfile(false);
    };
    fetchProfile();
  }, []);

  // Update URL when state changes
  const updateURL = (
    page: number,
    sortBy: string,
    direction: "asc" | "desc"
  ) => {
    const params = new URLSearchParams();
    if (page !== 1) params.set("page", page.toString());
    if (sortBy !== "name") params.set("sortBy", sortBy);
    if (direction !== "asc") params.set("sortDirection", direction);

    setSearchParams(params);
  };

  const handleSort = (field: keyof Canister) => {
    let newDirection: "asc" | "desc";
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      newDirection =
        field === "createdAt" || field === "lastDeployment" ? "desc" : "asc";
    }

    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); // Reset to first page when sorting changes
    updateURL(1, String(field), newDirection);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateURL(newPage, String(sortField), sortDirection);
  };

  const sortedCanisters = [...canisters].sort((a, b) => {
    const aValue = a[sortField as keyof Canister];
    const bValue = b[sortField as keyof Canister];

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedCanisters = sortedCanisters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateCanister = async () => {
    setIsCreating(true);
    setActionError("");

    const result = await createCanister();

    if (result.success) {
      toast.success(
        "Canister created!",
        "Your new canister is ready for deployment."
      );
      setIsCreateModalOpen(false);
    } else {
      toast.error(
        "Failed to create canister",
        result.error || "There was an error creating your canister."
      );
      setActionError(result.error || "Failed to create canister");
    }

    setIsCreating(false);
  };

  const handleDeleteCanister = async () => {
    if (canisterToDelete) {
      setIsDeleting(true);
      setActionError("");

      const result = await deleteCanister(canisterToDelete.id);

      if (result.success) {
        toast.success(
          "Canister deleted",
          "Your canister has been successfully removed."
        );
        setIsDeleteModalOpen(false);
      } else {
        toast.error(
          "Failed to delete canister",
          result.error || "There was an error deleting your canister."
        );
        setActionError(result.error || "Failed to delete canister");
      }

      setCanisterToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleClaimFreeCanister = async () => {
    setIsClaimingFree(true);

    try {
      const result = await freeCanisterApi.claimFreeCanister();

      if (result.success && result.data) {
        toast.success(
          "Success!",
          `Free canister created: ${result.data.canisterId}`
        );
        // Refresh canisters list and profile
        await refreshCanisters();
        const profileResult = await profileApi.getProfile();
        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
        }
      } else {
        toast.error("Error", result.error || "Failed to claim free canister");
      }
    } catch (error) {
      toast.error(
        "Error",
        error instanceof Error ? error.message : "Failed to claim free canister"
      );
    } finally {
      setIsClaimingFree(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      deploying: "default",
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  // Show loading state
  if (canistersLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Canisters</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your deployed applications
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-lg">Loading canisters...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (canistersError) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Canisters</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your deployed applications
            </p>
          </div>
        </div>

        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{canistersError}</p>
              <Button
                onClick={() => {
                  refreshCanisters();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Zap className="h-4 w-4 text-green-500" />;
      case "inactive":
        return <Server className="h-4 w-4 text-gray-500" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Canisters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your deployed applications
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Free Canister Button */}
          {!isLoadingProfile && profile && !profile.freeCanisterClaimedAt && (
            <TooltipWrapper
              className="cursor-pointer"
              content="Start free: Get your first canister instantly"
              showArrow={false}
            >
              <Button
                onClick={handleClaimFreeCanister}
                disabled={isClaimingFree}
                variant="default"
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
              >
                {isClaimingFree ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Free Canister
                  </>
                )}
              </Button>
            </TooltipWrapper>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Canister
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
          Sort by:
        </div>
        <SortButton
          label="Name"
          active={sortField === "name"}
          direction={sortDirection}
          onClick={() => handleSort("name")}
        />
        <SortButton
          label="Created At"
          active={sortField === "createdAt"}
          direction={sortDirection}
          onClick={() => handleSort("createdAt")}
        />
        <SortButton
          label="Last Deployment"
          active={sortField === "lastDeployment"}
          direction={sortDirection}
          onClick={() => handleSort("lastDeployment")}
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {paginatedCanisters.map((canister) => (
          <Card
            key={canister.id}
            className="relative group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer border-border/50 hover:border-primary/20"
            onClick={() => navigate(`/panel/canister/${canister.icCanisterId}`)}
          >
            {/* Control Status Indicator */}
            {canister.isSystemController === false && (
              <div className="absolute top-0 left-0 right-0 h-3 bg-red-500/10 flex items-center justify-center z-10">
                <span className="text-[8px] font-medium text-red-600 tracking-[4px]">
                  not controlled by hosty.live
                </span>
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(canister.status)}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                      {canister.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      {canister.icCanisterId}
                    </p>
                  </div>
                </div>
                {getStatusBadge(canister.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Cycles
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-primary">
                      <CyclesCell
                        canisterId={canister.icCanisterId}
                        isSystemController={canister.isSystemController}
                      />
                    </p>
                    {canister.isSystemController && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTopUpCanisterId(canister.icCanisterId);
                          setIsTopUpModalOpen(true);
                        }}
                        title="Top up"
                        className="h-6 w-6 p-0"
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Created
                  </p>
                  <p className="font-semibold">
                    {new Date(canister.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Last Deployment
                </p>
                <p className="text-sm">
                  {new Date(canister.lastDeployment).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/panel/canister/${canister.icCanisterId}`);
                    }}
                    className="flex items-center gap-1 text-xs hover:bg-primary/10"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCanisterToDelete(canister);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
                {canister.frontendUrl && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(canister.frontendUrl, "_blank");
                    }}
                    className="text-xs font-medium bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Open App
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {canisters.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No canisters yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first canister to get started with deploying
              applications.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Canister
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, canisters.length)} of{" "}
              {canisters.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm px-3 py-1 bg-muted rounded-md">
                {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <CreateCanisterModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateCanister={handleCreateCanister}
        isLoading={isCreating}
        error={actionError}
      />

      <DeleteCanisterModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleDeleteCanister}
        canister={canisterToDelete}
        isLoading={isDeleting}
        error={actionError}
      />

      {topUpCanisterId && (
        <TopUpCanisterModal
          isOpen={isTopUpModalOpen}
          onClose={() => {
            setIsTopUpModalOpen(false);
            setTopUpCanisterId(null);
          }}
          canisterId={topUpCanisterId}
          userBalanceRaw={balanceRaw}
          formatTC={formatTC}
          onWithdraw={async (cid, amt) => {
            const res = await withdrawToCanister(cid, amt);
            toast.success(
              "Top up successful",
              `Deposit submitted. Block index: ${res.toString()}`
            );
            await refresh();
            return res;
          }}
          onRefreshBalance={refresh}
        />
      )}
    </div>
  );
}
