<?php

namespace App\Controller;

use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;

#[Route('/api')]
class AuthenticationController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly Security $security,
        private readonly SerializerInterface $serializer
    )
    {

    }
    #[Route('/authentication', name: 'app_authentication')]
    public function index(): Response
    {
        return $this->render('authentication/index.html.twig', [
            'controller_name' => 'AuthenticationController',
        ]);
    }

    #[Route('/register', name: 'register')]
    public function register(Request $request): JsonResponse
    {
        $jsonData = json_decode($request->getContent());
        $user = $this->userRepository->create($jsonData);

        return new JsonResponse([
            'user' => $this->serializer->serialize($user, 'json'),
            'message' => "User added successfully"
        ]);
    }

    #[Route('/profile', name: 'profile')]
    public function profile(): JsonResponse
    {
        $currentUser = $this->security->getUser();
        $user = $this->serializer->serialize($currentUser, 'json');

        return new JsonResponse([
            'user' => $user,
            'message' => "User profile loaded successfully"
        ]);
    }
}
